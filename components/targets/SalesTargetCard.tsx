import { Target } from 'lucide-react'
import { fetchMyTarget } from '@/lib/actions/sales-targets'

// Standalone staff widget (server component). Drop into
// app/dashboard/page.tsx with <SalesTargetCard /> — no props required.
// Accepts an optional month ("YYYY-MM"); defaults to the current month.
// Shows target vs achieved with a progress bar; when no target is set
// (or migration 051 is not applied yet) it says so instead of erroring.
export async function SalesTargetCard({ month }: { month?: string }) {
  const currentMonth = month ?? new Date().toISOString().slice(0, 7)
  const result = await fetchMyTarget(currentMonth)

  if (result.error || !result.data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Target className="w-5 h-5" /> Sales target
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          {result.error ?? 'Could not load your sales target.'}
        </p>
      </div>
    )
  }

  const { target_amount, has_target, achieved, progress_pct } = result.data
  const monthLabel = new Date(`${currentMonth}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  const remaining = Math.max(0, target_amount - achieved)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Target className="w-5 h-5" /> Sales target — {monthLabel}
      </h2>

      {!has_target ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          No sales target set for this month yet. Your admin will set one soon.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Rs {achieved.toLocaleString()}
              <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                {' '}of Rs {target_amount.toLocaleString()}
              </span>
            </p>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
              {progress_pct}%
            </p>
          </div>

          <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress_pct}%` }}
            />
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            {remaining > 0
              ? `Rs ${remaining.toLocaleString()} to go this month.`
              : 'Target reached — great work! 🎉'}
          </p>
        </>
      )}
    </div>
  )
}
