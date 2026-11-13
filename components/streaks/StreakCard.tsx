import { Flame } from 'lucide-react'
import { fetchActivityStreak } from '@/lib/actions/leaderboard'

// Standalone staff widget (server component). Drop into
// app/dashboard/page.tsx with <StreakCard /> — no props required.
// Shows the current daily-activity streak (lesson / quiz / assignment
// activity) plus the longest streak on record.
export async function StreakCard() {
  const result = await fetchActivityStreak()

  if (result.error || !result.data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" /> Activity streak
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          {result.error ?? 'Could not load your streak.'}
        </p>
      </div>
    )
  }

  const { current_streak, longest_streak } = result.data

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" /> Activity streak
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current streak</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {current_streak} {current_streak === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Longest streak</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {longest_streak} {longest_streak === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        {current_streak > 0
          ? 'Keep it going — complete a lesson, quiz, or assignment today to extend your streak.'
          : 'No activity yet — complete a lesson, quiz, or assignment to start your streak.'}
      </p>
    </div>
  )
}
