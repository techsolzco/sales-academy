'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

interface Quiz {
  id: string
  title: string
  status: string
}

interface Attempt {
  id: string
  quiz_id: string
  user_id: string
  score: number
  max_score: number
  percentage: number
  passed: boolean
  completed_at: string | null
  // Supabase can return a joined row as array or object depending on cardinality
  profile: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
}

function getProfile(a: Attempt): { full_name: string | null; email: string } | null {
  if (!a.profile) return null
  if (Array.isArray(a.profile)) return a.profile[0] ?? null
  return a.profile
}

interface QuizPerformancePanelProps {
  toolId: string
  quizzes: Quiz[]
  attempts: Attempt[]
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-amber-100 text-amber-700',
    archived: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function formatDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function QuizPerformancePanel({ toolId, quizzes, attempts }: QuizPerformancePanelProps) {
  const [expanded, setExpanded] = useState(true)

  if (quizzes.length === 0) {
    return (
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-brand-500" />
          Quizzes &amp; Salesman Performance
        </h2>
        <p className="text-sm text-gray-400">No quizzes have been created for this tool yet.</p>
        <Link
          href={`/admin/quizzes/new?tool=${toolId}`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Create first quiz <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  // Map quiz_id → title for display in attempts
  const quizTitleMap: Record<string, string> = {}
  quizzes.forEach(q => { quizTitleMap[q.id] = q.title })

  const recentAttempts = attempts.slice(0, 30)

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
        onClick={() => setExpanded(v => !v)}
      >
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-brand-500" />
          Quizzes &amp; Salesman Performance
          <span className="text-xs font-medium text-gray-400 ml-1">({quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}, {attempts.length} attempt{attempts.length !== 1 ? 's' : ''})</span>
        </h2>
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-5 border-t border-gray-100">
          {/* Quiz list */}
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quizzes</p>
            <div className="flex flex-wrap gap-2">
              {quizzes.map(q => (
                <Link
                  key={q.id}
                  href={`/admin/quizzes/${q.id}`}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition"
                >
                  📝 {q.title}
                  <StatusBadge status={q.status} />
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>

          {/* Attempts */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Recent Attempts {recentAttempts.length > 0 && `(${recentAttempts.length})`}
            </p>

            {recentAttempts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-xl border border-gray-100">
                No attempts yet — quizzes haven&apos;t been taken by any salesman.
              </p>
            ) : (
              <>
                {/* Mobile: card stack */}
                <div className="sm:hidden space-y-3">
                  {recentAttempts.map(a => (
                    <div key={a.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {getProfile(a)?.full_name ?? getProfile(a)?.email ?? 'Unknown'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {a.passed ? '✅ Passed' : '❌ Failed'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{quizTitleMap[a.quiz_id] ?? '—'}</p>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="font-semibold text-base text-gray-800">{a.percentage.toFixed(0)}%</span>
                        <span className="text-gray-400">{formatDate(a.completed_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Salesman</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quiz</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentAttempts.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[180px]">
                          {getProfile(a)?.full_name ?? getProfile(a)?.email ?? 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                            {quizTitleMap[a.quiz_id] ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-800">
                            {a.percentage.toFixed(0)}%
                            <span className="text-xs font-normal text-gray-400 ml-1">({a.score}/{a.max_score})</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                              {a.passed ? '✅ Passed' : '❌ Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                            {formatDate(a.completed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
