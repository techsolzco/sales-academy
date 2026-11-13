'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, Bot, User, Shuffle, Play, Trophy, RotateCcw, Star, AlertCircle,
} from 'lucide-react'
import {
  startRoleplaySession,
  sendRoleplayMessage,
  endRoleplaySession,
  fetchRoleplaySession,
  type RoleplaySession,
  type RoleplayScenarios,
} from '@/lib/actions/roleplay'

interface RoleplayClientProps {
  initialScenarios: RoleplayScenarios
  initialSessions: RoleplaySession[]
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800'
  if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800'
  return 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800'
}

export function RoleplayClient({ initialScenarios, initialSessions }: RoleplayClientProps) {
  const [scenarios] = useState<RoleplayScenarios>(initialScenarios)
  const [sessions, setSessions] = useState<RoleplaySession[]>(initialSessions)
  const [active, setActive] = useState<RoleplaySession | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.transcript, isLoading])

  const exchangesUsed = active
    ? active.transcript.filter(m => m.role === 'salesman').length
    : 0

  async function handleStart(params: { objectionId?: string; scriptId?: string }) {
    setIsStarting(true)
    setError(null)
    const result = await startRoleplaySession(params)
    setIsStarting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.data) {
      setActive(result.data)
      setSessions(prev => [result.data as RoleplaySession, ...prev])
    }
  }

  async function handleOpenSession(session: RoleplaySession) {
    setError(null)
    // Re-fetch so the transcript is fresh (e.g. after a page reload).
    const result = await fetchRoleplaySession(session.id)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.data) setActive(result.data)
  }

  async function handleSend() {
    if (!input.trim() || isLoading || !active || active.status !== 'active') return
    const text = input.trim()
    setInput('')
    setIsLoading(true)
    setError(null)
    const result = await sendRoleplayMessage(active.id, text)
    setIsLoading(false)
    if (result.error) {
      setError(result.error)
      setInput(text)
      return
    }
    if (result.data) {
      setActive(result.data)
      setSessions(prev => prev.map(s => (s.id === result.data!.id ? result.data as RoleplaySession : s)))
    }
  }

  async function handleEnd() {
    if (!active || isEnding) return
    setIsEnding(true)
    setError(null)
    const result = await endRoleplaySession(active.id)
    setIsEnding(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.data) {
      setActive(result.data)
      setSessions(prev => prev.map(s => (s.id === result.data!.id ? result.data as RoleplaySession : s)))
    }
  }

  function handleNewPractice() {
    setActive(null)
    setError(null)
    setInput('')
  }

  // ── Chat view ────────────────────────────────────────────────────────────
  if (active) {
    const completed = active.status === 'completed'
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {active.scenario_title}
            </h2>
            <p className="text-xs text-gray-400">
              {completed ? 'Completed' : `Practice chat · ${exchangesUsed}/20 exchanges used`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewPractice}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> New practice
          </button>
        </div>

        {completed && active.score !== null && (
          <div className={`rounded-xl border p-4 ${scoreColor(active.score)}`}>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <span className="text-lg font-bold">Score: {active.score}/100</span>
            </div>
            {active.feedback && (
              <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{active.feedback}</p>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col h-[540px] bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5">
            {active.transcript.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'salesman' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'customer' && (
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex flex-shrink-0 items-center justify-center border border-brand-200 dark:border-brand-700">
                    <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                )}
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'salesman'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tr-sm'
                    : 'bg-brand-600 text-white rounded-tl-sm shadow-md'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'salesman' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex flex-shrink-0 items-center justify-center border border-gray-300 dark:border-gray-600">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex flex-shrink-0 items-center justify-center border border-brand-200 dark:border-brand-700">
                  <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> Customer is typing...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!completed ? (
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                  placeholder="Reply as the salesman..."
                  maxLength={1000}
                  className="w-full pl-5 pr-14 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                  aria-label="Send reply"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleEnd}
                  disabled={isEnding}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  End &amp; Score
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Session completed. Read the feedback above, then start a new practice round.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Picker view ──────────────────────────────────────────────────────────
  const completedSessions = sessions.filter(s => s.status === 'completed')
  const activeSessions = sessions.filter(s => s.status === 'active')

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-brand-600 text-white rounded-2xl p-5 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold">Practise with a difficult customer — no real customer at risk</h2>
        <p className="text-sm text-brand-100 mt-1 max-w-2xl">
          The AI plays a tough Pakistani customer in Hinglish and raises a real objection.
          Handle it like a real WhatsApp chat — you get a score and feedback when you end the session.
        </p>
        <button
          type="button"
          onClick={() => handleStart({})}
          disabled={isStarting}
          className="mt-4 flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
          Random difficult customer
        </button>
      </div>

      {activeSessions.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Continue a session</h3>
          <div className="space-y-2">
            {activeSessions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleOpenSession(s)}
                className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-400 rounded-xl px-4 py-3"
              >
                <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{s.scenario_title}</span>
                <span className="block text-xs text-gray-400 mt-0.5">
                  Started {new Date(s.created_at).toLocaleString()} · {s.transcript.filter(m => m.role === 'salesman').length}/20 exchanges
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Practise against an objection</h3>
        {scenarios.objections.length === 0 ? (
          <p className="text-sm text-gray-400">No published objections yet — use the random customer above once an admin publishes one.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {scenarios.objections.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => handleStart({ objectionId: o.id })}
                disabled={isStarting}
                className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-400 rounded-xl px-4 py-3 disabled:opacity-50"
              >
                <span className="flex items-start gap-2">
                  <Play className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">{o.title}</span>
                    {o.difficulty && (
                      <span className="inline-block mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {o.difficulty}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {scenarios.scripts.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Practise a script situation</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {scenarios.scripts.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStart({ scriptId: s.id })}
                disabled={isStarting}
                className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-400 rounded-xl px-4 py-3 disabled:opacity-50"
              >
                <span className="flex items-start gap-2">
                  <Play className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">{s.title}</span>
                    {s.difficulty && (
                      <span className="block text-xs text-gray-400 mt-0.5 capitalize">{s.difficulty.replace(/_/g, ' ')}</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {completedSessions.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Your past scores</h3>
          <div className="space-y-2">
            {completedSessions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleOpenSession(s)}
                className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-400 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{s.scenario_title}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{new Date(s.created_at).toLocaleDateString()}</span>
                </span>
                {s.score !== null && (
                  <span className={`flex-shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${scoreColor(s.score)}`}>
                    {s.score}/100
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
