import { fetchMySales } from '@/lib/actions/sales'

// Standalone staff widget (server component): drop into
// app/dashboard/page.tsx with <MySalesSummary /> — no props required.
// Shows this month's total + the intern's recent sales. Accepts an
// optional month ("YYYY-MM"); defaults to the current month.
export async function MySalesSummary({ month }: { month?: string }) {
  const currentMonth = month ?? new Date().toISOString().slice(0, 7)
  const result = await fetchMySales(currentMonth)

  if (result.error || !result.data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">My Sales</h2>
        <p className="text-sm text-red-600 dark:text-red-400">{result.error ?? 'Could not load your sales.'}</p>
      </div>
    )
  }

  const { sales, monthly_total, sale_count } = result.data
  const monthLabel = new Date(`${currentMonth}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Sales — {monthLabel}</h2>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total this month</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Rs {monthly_total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sales this month</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{sale_count}</p>
        </div>
      </div>

      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3">Recent sales</h3>
      {sales.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No sales logged yet this month. Log your first sale below.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {sales.slice(0, 10).map(sale => (
            <li key={sale.id} className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {sale.product_name}
                  {sale.bundle_name ? ` · ${sale.bundle_name}` : ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {new Date(`${sale.sale_date}T00:00:00Z`).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {sale.customer_ref ? ` · ${sale.customer_ref}` : ''}
                </p>
                {sale.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{sale.notes}</p>
                )}
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                Rs {sale.amount_pkr.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
