'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchNotifications, fetchUnreadCount, markAllRead, markRead } from '@/lib/actions/notifications'
import { Confetti } from '@/components/ui/Confetti'

const PAGE_SIZE = 20

/**
 * B8 — device-local broadcast read receipts (WORKAROUND, not the real fix).
 * The schema has no per-user read state for broadcast (user_id IS NULL)
 * notifications — see the header comment in lib/actions/notifications.ts.
 * Until the `notification_reads` migration lands, broadcast ids the user
 * has marked read are kept in localStorage under this key, scoped per
 * effective user, and overlaid onto the rows below. That makes the red
 * dot actually clear on this device; other devices/browsers still show
 * those broadcasts unread until the migration exists.
 */
function broadcastReadKey(userId: string) {
  return `sa_broadcast_read:${userId}`
}

function loadBroadcastReadIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(broadcastReadKey(userId))
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function storeBroadcastReadIds(userId: string, ids: string[]) {
  try {
    const prev = loadBroadcastReadIds(userId)
    ids.forEach((id) => prev.add(id))
    localStorage.setItem(broadcastReadKey(userId), JSON.stringify(Array.from(prev)))
  } catch {
    // localStorage unavailable (private mode etc.) — bell still works,
    // broadcast rows just stay unread on this device until the migration.
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<{ title: string, body: string } | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  // B58 — server-side unread total (own + broadcast). Used only to know
  // whether unread items exist beyond the loaded page; the red dot is
  // driven by local rows, NOT this count, because until the B8 migration
  // lands the server count can never reach 0 while a broadcast is unread.
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // B75 — every timer goes through here so it can be cleared on unmount.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }, [])

  const applyBroadcastRead = useCallback((rows: any[], forUserId: string) => {
    const readIds = loadBroadcastReadIds(forUserId)
    return rows.map((n) => (n.user_id === null && readIds.has(n.id) ? { ...n, read: true } : n))
  }, [])

  const loadPage = useCallback(async (offset: number) => {
    // B59 — pass the EFFECTIVE user id (the same id this component
    // received as its prop from the layout) so list/count/mark-read all
    // act on the impersonated student, not on the admin's own rows.
    const notifs = await fetchNotifications(userId, { limit: PAGE_SIZE, offset })
    const withOverlay = applyBroadcastRead(notifs, userId)
    setHasMore(notifs.length === PAGE_SIZE)
    return withOverlay
  }, [userId, applyBroadcastRead])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [notifs, unread] = await Promise.all([
        loadPage(0),
        fetchUnreadCount(userId),
      ])
      if (cancelled) return
      setNotifications(notifs)
      setServerUnreadCount(unread)
    }
    load()
    return () => { cancelled = true }
  }, [userId, loadPage])

  useEffect(() => {
    const supabase = createClient()
    // B56 — the old filter `user_id=eq.<id>` never matches broadcast
    // rows (NULL never equals anything), so broadcast notifications
    // never arrived live. Subscribe with NO user_id filter and filter
    // client-side instead: own rows + broadcasts only. Supabase
    // Realtime still enforces the table's RLS SELECT policy server-side
    // (own / broadcast / admin-all), so other users' rows are not
    // delivered to this client in the first place.
    const channel = supabase.channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any
          if (newNotif.user_id !== null && newNotif.user_id !== userId) return
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotif.id)) return prev
            return [newNotif, ...prev]
          })
          setToast({ title: newNotif.title, body: newNotif.body })
          // B75 — clear any previous toast/confetti timers before
          // scheduling new ones, so they can't fire after unmount or
          // stack up across rapid notifications.
          timersRef.current.forEach(clearTimeout)
          timersRef.current = []
          later(() => setToast(null), 5000)

          if (newNotif.type === 'badge') {
            setShowConfetti(true)
            later(() => setShowConfetti(false), 5000)
          }
        }
      )
      .subscribe()

    return () => {
      // B75 — cleanup: clear pending toast/confetti timers on unmount
      // (or when the effective user changes) as well as the channel.
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      supabase.removeChannel(channel)
    }
  }, [userId, later])

  // B75 — belt-and-braces unmount cleanup for any timer scheduled
  // outside the realtime effect.
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // B57 — check the ActionResult.error from markAllRead and only mark
  // local rows read on success; on failure show an error instead of
  // lying optimistically (the old code set every row read unconditionally).
  const handleMarkAllRead = async () => {
    setError(null)
    const result = await markAllRead(userId)
    if (result.error) {
      setError(result.error)
      return
    }
    // B8 — broadcasts are not flipped in the DB; record them read
    // device-locally so the dot clears here until the migration lands.
    if (result.data?.broadcastUnreadIds?.length) {
      storeBroadcastReadIds(userId, result.data.broadcastUnreadIds)
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setServerUnreadCount(await fetchUnreadCount(userId))
  }

  // B58 — single mark-read on click, wired to the previously-dead
  // markRead(); broadcast rows are recorded device-locally (see B8 note).
  const handleNotificationClick = async (n: any) => {
    if (n.read) return
    setError(null)
    const result = await markRead(n.id, userId)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.data?.broadcast) {
      storeBroadcastReadIds(userId, [n.id])
    }
    setNotifications(prev => prev.map(item => (item.id === n.id ? { ...item, read: true } : item)))
  }

  // B56 — "Load more": fetch the next page and append (deduped).
  const handleLoadMore = async () => {
    setLoadingMore(true)
    setError(null)
    try {
      const page = await loadPage(notifications.length)
      setNotifications(prev => {
        const seen = new Set(prev.map(n => n.id))
        return [...prev, ...page.filter(n => !seen.has(n.id))]
      })
    } finally {
      setLoadingMore(false)
    }
  }

  // Unread items may exist beyond the loaded page even when the page
  // came back full-size; the server count is the only signal for that.
  const moreUnreadBeyondPage =
    serverUnreadCount !== null && serverUnreadCount > notifications.filter(n => !n.read).length

  return (
    <>
      {showConfetti && <Confetti duration={4000} />}
      <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gray-100 transition relative"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                Mark all read
              </button>
            )}
          </div>
          {error && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {notifications.map(n => {
                  // B58 — each row is clickable via its stored `link`
                  // field when present; clicking also marks it read.
                  const inner = (
                    <>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{n.body}</p>
                      <span className="text-[10px] text-gray-400 mt-2 block">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </>
                  )
                  const className = `block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer ${!n.read ? 'bg-brand-50/30' : ''}`
                  return n.link ? (
                    <a key={n.id} href={n.link} onClick={() => handleNotificationClick(n)} className={className}>
                      {inner}
                    </a>
                  ) : (
                    <div key={n.id} onClick={() => handleNotificationClick(n)} className={className} role="button" tabIndex={0}>
                      {inner}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {(hasMore || moreUnreadBeyondPage) && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
              {moreUnreadBeyondPage && !hasMore && (
                <p className="text-[11px] text-gray-400 mt-1">More unread notifications below</p>
              )}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed top-20 right-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 animate-fade-in max-w-sm">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{toast.title}</h4>
          <p className="text-xs text-gray-500 mt-1">{toast.body}</p>
        </div>
      )}
    </div>
    </>
  )
}
