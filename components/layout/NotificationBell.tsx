'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchNotifications, markAllRead } from '@/lib/actions/notifications'

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<{ title: string, body: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    async function load() {
      const notifs = await fetchNotifications()
      setNotifications(notifs)
    }
    load()
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotif = payload.new as any
          setNotifications(prev => [newNotif, ...prev])
          setToast({ title: newNotif.title, body: newNotif.body })
          setTimeout(() => setToast(null), 3000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

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

  const handleMarkAllRead = async () => {
    await markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <div key={n.id} className={`p-4 hover:bg-gray-50 transition ${!n.read ? 'bg-brand-50/30' : ''}`}>
                    <h4 className="text-sm font-medium text-gray-900">{n.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{n.body}</p>
                    <span className="text-[10px] text-gray-400 mt-2 block">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-20 right-8 bg-white p-4 rounded-xl shadow-lg border border-gray-100 z-50 animate-fade-in max-w-sm">
          <h4 className="text-sm font-semibold text-gray-900">{toast.title}</h4>
          <p className="text-xs text-gray-500 mt-1">{toast.body}</p>
        </div>
      )}
    </div>
  )
}
