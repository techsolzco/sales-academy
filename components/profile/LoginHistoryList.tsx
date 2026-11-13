import { fetchMyLoginHistory } from '@/lib/actions/login-history'

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Staff profile section: the logged-in user's own recent sign-ins.
 * Server component — fetches via fetchMyLoginHistory(), which only ever
 * returns the session user's own rows (RLS-backed).
 *
 * Wiring (do NOT edit the profile page in this change — add this snippet
 * to app/dashboard/profile/page.tsx, e.g. after the "My Badges" section):
 *
 *   import { LoginHistoryList } from '@/components/profile/LoginHistoryList'
 *   ...
 *   <LoginHistoryList />
 */
export async function LoginHistoryList({ limit = 10 }: { limit?: number }) {
  const result = await fetchMyLoginHistory(limit)
  const rows = result.data ?? []

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Sign-ins</h2>
      {result.error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          {result.error}
        </p>
      )}
      {!result.error && rows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No sign-ins recorded yet.</p>
      )}
      {!result.error && rows.length > 0 && (
        <ul className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                {formatTime(row.signed_in_at)}
              </span>
              <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                {row.ip_address || 'IP unknown'}
              </span>
              <span
                className="text-gray-500 dark:text-gray-400 truncate max-w-xs"
                title={row.user_agent || ''}
              >
                {row.user_agent || 'Unknown device'}
              </span>
              {row.is_new_device && (
                <span className="inline-flex text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold uppercase tracking-wider">
                  New device
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
