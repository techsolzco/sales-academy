'use client'

import { useState } from 'react'

// ─── CSV export buttons (audit §3 #15, MEDIUM) ──────────────────────────────
// Client component: plain anchor links to GET /api/export (admin-only
// route — 401/403 for anyone else). The quiz-results export takes a quiz
// select; the sales export takes from/to date inputs. No server action is
// called from here, so no admin check is needed in this component — the
// route enforces it.
//
// Props: `quizzes` (id + title) is optional. Pass it from the admin quizzes
// page / leaderboard page so the quiz select is populated; without it the
// quiz export downloads all quizzes. See the wiring snippet in the
// function-#15 handoff for where to mount this component.

export interface ExportQuizOption {
  id: string
  title: string
}

export function ExportButtons({ quizzes = [] }: { quizzes?: ExportQuizOption[] }) {
  const [quizId, setQuizId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const quizHref = quizId
    ? `/api/export?type=quiz-results&quizId=${encodeURIComponent(quizId)}`
    : '/api/export?type=quiz-results'
  const salesParams = new URLSearchParams({ type: 'sales' })
  if (from) salesParams.set('from', from)
  if (to) salesParams.set('to', to)
  const salesHref = `/api/export?${salesParams.toString()}`

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Export CSV
      </h2>
      <div className="flex flex-wrap gap-4 items-end">
        <a
          href="/api/export?type=users"
          download
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl font-medium transition"
        >
          Export Users
        </a>
        <a
          href="/api/export?type=leaderboard"
          download
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl font-medium transition"
        >
          Export Leaderboard
        </a>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quiz results
          </label>
          <div className="flex gap-2">
            <select
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 min-w-[200px]"
            >
              <option value="">All quizzes</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
            <a
              href={quizHref}
              download
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl font-medium transition"
            >
              Export
            </a>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sales (date range, optional)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Sales from date"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Sales to date"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700"
            />
            <a
              href={salesHref}
              download
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl font-medium transition"
            >
              Export
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
