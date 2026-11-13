import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SalesReportFilters } from './SalesReportFilters'
import { fetchActiveSalesmen } from '@/lib/actions/view-as-student'
import { fetchSalesReport } from '@/lib/actions/sales'

function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const to =
    m === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(m + 1).padStart(2, '0')}-01`
  // fetchSalesReport's `to` is inclusive, so use the last day of the month.
  const lastDay = new Date(`${to}T00:00:00Z`)
  lastDay.setUTCDate(lastDay.getUTCDate() - 1)
  return { from, to: lastDay.toISOString().slice(0, 10) }
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: { month?: string; userId?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const month = searchParams.month || new Date().toISOString().slice(0, 7)
  const userId = searchParams.userId || undefined
  const { from, to } = monthRange(month)

  const salesmen = await fetchActiveSalesmen()
  const reportResult = await fetchSalesReport({ from, to, user_id: userId })

  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  if (reportResult.error || !reportResult.data) {
    return (
      <div className="px-4 py-5 md:p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Report</h1>
        <p className="text-sm text-red-600 dark:text-red-400 mt-4">{reportResult.error ?? 'Sales report returned no data.'}</p>
      </div>
    )
  }

  const { totals, grand_total, grand_count, sales } = reportResult.data
  // Leaderboard for the selected period: the per-intern totals are already
  // sorted by total desc, so they rank the interns for this month/filter.
  // (fetchSalesLeaderboard is the all-time, any-user version — see
  // lib/actions/sales.ts — and is not used on this filtered report page.)
  const leaderboard = totals

  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Report</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Per-intern sales totals, leaderboard and individual sales for {monthLabel}.
        </p>
      </div>

      <SalesReportFilters salesmen={salesmen} />

      {/* Grand totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total sales ({monthLabel})</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Rs {grand_total.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Number of sales</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{grand_count}</p>
        </div>
      </div>

      {/* Per-intern totals */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Per-Intern Totals</h2>
      {totals.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 py-10 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          No sales recorded for this period.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <tr>
                  <th className="px-6 py-4">Intern</th>
                  <th className="px-6 py-4 text-center">Sales</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {totals.map(t => (
                  <tr key={t.user_id} className="hover:bg-gray-50 dark:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{t.full_name}</td>
                    <td className="px-6 py-4 text-center">{t.sale_count}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      Rs {t.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales leaderboard (selected period) */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Sales Leaderboard</h2>
      {leaderboard.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 py-10 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          No sales recorded yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Intern</th>
                  <th className="px-6 py-4 text-center">Sales</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {leaderboard.map((entry, i) => (
                  <tr key={entry.user_id} className="hover:bg-gray-50 dark:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">#{i + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{entry.full_name}</td>
                    <td className="px-6 py-4 text-center">{entry.sale_count}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      Rs {entry.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent sales */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Sales</h2>
      {sales.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 py-10 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          No sales recorded for this period.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Intern</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Bundle</th>
                  <th className="px-6 py-4">Customer Ref</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(`${sale.sale_date}T00:00:00Z`).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{sale.full_name}</td>
                    <td className="px-6 py-4">{sale.product_name}</td>
                    <td className="px-6 py-4">{sale.bundle_name ?? '—'}</td>
                    <td className="px-6 py-4">{sale.customer_ref ?? '—'}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      Rs {sale.amount_pkr.toLocaleString()}
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
