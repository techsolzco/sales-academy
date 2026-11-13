import Link from 'next/link'
import { fetchLoginHistory, fetchLoginHistoryUsers } from '@/lib/actions/login-history'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function LoginHistoryPage({
  searchParams,
}: {
  searchParams?: { user?: string; page?: string }
}) {
  const userFilter = searchParams?.user || ''
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const [historyResult, usersResult] = await Promise.all([
    fetchLoginHistory({
      user_id: userFilter || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    fetchLoginHistoryUsers(),
  ])

  const rows = historyResult.data ?? []
  const users = usersResult.data ?? []
  const hasMore = rows.length === PAGE_SIZE

  const pageLink = (targetPage: number) => {
    const params = new URLSearchParams()
    if (userFilter) params.set('user', userFilter)
    if (targetPage > 1) params.set('page', String(targetPage))
    const qs = params.toString()
    return qs ? `/admin/login-history?${qs}` : '/admin/login-history'
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl">
      <Breadcrumb crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Login History' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login History</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Every successful sign-in, newest first. Admins are notified in the bell when their
          account signs in from a new device.
        </p>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <label htmlFor="user-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by user
        </label>
        <select
          id="user-filter"
          name="user"
          defaultValue={userFilter}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email || u.id}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          Filter
        </button>
        {userFilter && (
          <Link href="/admin/login-history" className="text-sm text-brand-600 hover:underline">
            Clear filter
          </Link>
        )}
      </form>

      {historyResult.error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          {historyResult.error}
        </p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Signed in</th>
                <th className="px-4 py-3 font-medium">IP address</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No sign-ins recorded yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {row.profiles?.full_name || 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatTime(row.signed_in_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                    {row.ip_address || '—'}
                  </td>
                  <td
                    className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate"
                    title={row.user_agent || ''}
                  >
                    {row.user_agent || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.is_new_device && (
                      <span className="inline-flex text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold uppercase tracking-wider">
                        New device
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm">
        {page > 1 && (
          <Link href={pageLink(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            ← Previous
          </Link>
        )}
        <span className="text-gray-500 dark:text-gray-400">Page {page}</span>
        {hasMore && (
          <Link href={pageLink(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Next →
          </Link>
        )}
      </div>
    </div>
  )
}
