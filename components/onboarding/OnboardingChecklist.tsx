import { CheckCircle2, Circle } from 'lucide-react'
import { fetchOnboardingChecklist, type OnboardingItem } from '@/lib/actions/onboarding'

// Standalone staff widget (server component). Drop into
// app/dashboard/page.tsx with <OnboardingChecklist /> — no props required.
// Pass `items` to render a pre-fetched checklist instead (e.g. the admin
// view, fed by fetchOnboardingStatus). Returns nothing once all 4 items
// are done, so it only shows while the intern still has steps left.
export async function OnboardingChecklist({ items }: { items?: OnboardingItem[] }) {
  let checklist = items
  if (!checklist) {
    const result = await fetchOnboardingChecklist()
    if (result.error || !result.data) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Getting started</h2>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            {result.error ?? 'Could not load your onboarding checklist.'}
          </p>
        </div>
      )
    }
    checklist = result.data.items
  }

  const doneCount = checklist.filter(i => i.done).length
  if (doneCount === checklist.length) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Getting started</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {doneCount} of {checklist.length} done
        </p>
      </div>

      <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${Math.round((doneCount / checklist.length) * 100)}%` }}
        />
      </div>

      <ul className="mt-4 space-y-3">
        {checklist.map(item => (
          <li key={item.key} className="flex items-center gap-3">
            {item.done ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
            )}
            <span
              className={
                item.done
                  ? 'text-sm text-gray-400 dark:text-gray-500 line-through'
                  : 'text-sm font-medium text-gray-900 dark:text-gray-100'
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
