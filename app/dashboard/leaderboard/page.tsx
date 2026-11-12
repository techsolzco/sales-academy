import { createClient } from '@/lib/supabase/server'
import { SITE_NAME } from '@/lib/config/site'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { fetchLeaderboard } from '@/lib/actions/leaderboard'

export const metadata = {
  title: `Leaderboard 🏆 | ${SITE_NAME}`,
}

export default async function DashboardLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: entries, error } = await fetchLeaderboard()

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leaderboard 🏆</h1>
        <p className="text-gray-500 mt-1">See how you rank against other sales professionals.</p>
      </div>
      
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Leaderboard could not be loaded: {error}
        </div>
      ) : (
        <LeaderboardTable entries={entries ?? []} currentUserId={user.id} />
      )}
    </div>
  )
}

