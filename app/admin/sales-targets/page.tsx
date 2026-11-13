import { redirect } from 'next/navigation'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { fetchTargetsForMonth } from '@/lib/actions/sales-targets'
import { fetchTeamMembers } from '@/lib/actions/users'
import { SetSalesTargetForm } from './SetSalesTargetForm'

export const dynamic = 'force-dynamic'

export default async function AdminSalesTargetsPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const { profile } = await getEffectiveUser()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const monthParam = searchParams.month
  const month =
    monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
      ? monthParam
      : new Date().toISOString().slice(0, 7)

  const [targetsRes, team] = await Promise.all([
    fetchTargetsForMonth(month),
    fetchTeamMembers(true),
  ])
  const rows = targetsRes.data ?? []
  const users = (team ?? [])
    .filter((u: any) => u.role === 'salesman')
    .map((u: any) => ({ id: u.id as string, full_name: u.full_name as string | null }))

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Targets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set monthly sales targets for interns and track progress against logged sales.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition"
          >
            View
          </button>
        </form>
      </div>

      <SetSalesTargetForm users={users} month={month} />

      {targetsRes.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{targetsRes.error}</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No targets set for {month} yet. Use the form above to set one.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold">Intern</th>
                <th className="px-4 py-3 font-semibold text-right">Target</th>
                <th className="px-4 py-3 font-semibold text-right">Achieved</th>
                <th className="px-4 py-3 font-semibold text-right">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.user_id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.full_name}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">Rs {row.target_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">Rs {row.achieved.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${row.progress_pct >= 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'}`}>
                      {row.progress_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
