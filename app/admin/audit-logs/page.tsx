import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchAuditLogs, fetchAuditLogActions, fetchAuditLogActors } from '@/lib/actions/audit-logs'

const PAGE_SIZE = 50

function buildHref(base: Record<string, string>, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `/admin/audit-logs?${query}` : '/admin/audit-logs'
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { search?: string; action?: string; user_id?: string; from?: string; to?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const search = searchParams.search || ''
  const action = searchParams.action || ''
  const userId = searchParams.user_id || ''
  const from = searchParams.from || ''
  const to = searchParams.to || ''
  const page = Math.max(parseInt(searchParams.page || '1', 10) || 1, 1)

  const [{ data: result, error }, { data: actions }, { data: actors }] = await Promise.all([
    fetchAuditLogs({
      search: search || undefined,
      action: action || undefined,
      user_id: userId || undefined,
      from: from || undefined,
      to: to || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    fetchAuditLogActions(),
    fetchAuditLogActors(),
  ])

  const rows = result?.rows ?? []
  const hasMore = result?.hasMore ?? false
  const filters = { search, action, user_id: userId, from, to }

  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
          Who did what, when — across the audit log and admin audit log tables.
        </p>
      </div>

      <form
        method="get"
        action="/admin/audit-logs"
        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-wrap gap-4 items-end"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Action or details…"
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 min-w-[200px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
          <select
            name="action"
            defaultValue={action}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 min-w-[180px]"
          >
            <option value="">All actions</option>
            {(actions ?? []).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actor</label>
          <select
            name="user_id"
            defaultValue={userId}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 min-w-[180px]"
          >
            <option value="">All actors</option>
            {(actors ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <button
          type="submit"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          Apply Filters
        </button>
        <Link href="/admin/audit-logs" className="text-brand-600 hover:text-brand-700 text-sm font-medium px-2 py-2">
          Clear
        </Link>
      </form>

      {error ? (
        <div className="text-red-600 py-10 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          Failed to load audit logs: {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 py-10 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          No audit log entries found for these filters.
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Time</th>
                    <th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="hover:bg-gray-50 dark:bg-gray-900/50 transition-colors align-top">
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.actor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium px-2 py-1 rounded-full">
                          {row.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 break-words max-w-[420px]">{row.details}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        {row.source === 'admin_audit_logs' ? 'Admin log' : 'Audit log'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            {page > 1 ? (
              <Link
                href={buildHref(filters, { page: String(page - 1) })}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 transition"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Page {page}</span>
            {hasMore ? (
              <Link
                href={buildHref(filters, { page: String(page + 1) })}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 transition"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </div>
  )
}
