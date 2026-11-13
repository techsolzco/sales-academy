import Link from 'next/link'
import { ArrowLeft, Bot, User, Trophy } from 'lucide-react'
import { fetchAllRoleplaySessions, fetchRoleplaySession } from '@/lib/actions/roleplay'

function scoreBadge(score: number | null): string {
  if (score === null) return 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
  if (score >= 80) return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20'
  if (score >= 60) return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20'
  return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20'
}

export default async function AdminRoleplayPage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  // ── Detail view ──────────────────────────────────────────────────────────
  if (searchParams.id) {
    const result = await fetchRoleplaySession(searchParams.id)
    if (result.error || !result.data) {
      return (
        <div className="px-4 py-5 md:p-8 max-w-5xl animate-fade-in">
          <Link href="/admin/roleplay" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="w-4 h-4" /> Back to roleplay sessions
          </Link>
          <div className="mt-6 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-xl">
            {result.error || 'Practice session not found.'}
          </div>
        </div>
      )
    }
    const session = result.data
    return (
      <div className="px-4 py-5 md:p-8 max-w-5xl animate-fade-in">
        <Link href="/admin/roleplay" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="w-4 h-4" /> Back to roleplay sessions
        </Link>

        <div className="mt-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{session.scenario_title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {session.user_name ?? 'Unknown intern'} · {new Date(session.created_at).toLocaleString()}
            {' · '}{session.status === 'completed' ? 'Completed' : 'Active'}
          </p>
        </div>

        {session.status === 'completed' && session.score !== null && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">Score: {session.score}/100</span>
            </div>
            {session.feedback && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">{session.feedback}</p>
            )}
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 space-y-5">
          {session.transcript.length === 0 ? (
            <p className="text-sm text-gray-400">No messages in this session yet.</p>
          ) : (
            session.transcript.map((msg, i) => (
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
            ))
          )}
        </div>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────
  const result = await fetchAllRoleplaySessions()

  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roleplay Practice</h1>
        <p className="text-gray-400 text-sm mt-1">
          Review interns&apos; AI mock-customer practice sessions and scores. Click a row to read the full chat.
        </p>
      </div>

      {result.error ? (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-xl">
          {result.error}
        </div>
      ) : result.data!.length === 0 ? (
        <div className="text-sm text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl text-center">
          No roleplay sessions yet. Interns&apos; practice sessions will appear here.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 font-medium">Intern</th>
                  <th className="px-4 py-3 font-medium">Scenario</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {result.data!.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      <Link href={`/admin/roleplay?id=${s.id}`} className="hover:text-brand-600">
                        {s.user_name ?? 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      <Link href={`/admin/roleplay?id=${s.id}`} className="hover:text-brand-600">
                        {s.scenario_title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {s.score !== null ? (
                        <span className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-xs ${scoreBadge(s.score)}`}>
                          {s.score}/100
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        s.status === 'completed'
                          ? 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20'
                          : 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20'
                      }`}>
                        {s.status === 'completed' ? 'Completed' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
