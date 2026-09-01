import { createClient } from '@/lib/supabase/server'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { fetchLeaderboard } from '@/lib/actions/leaderboard'

export const metadata = {
  title: 'Sales Leaderboard — All Rankings | Admin Portal',
}

export default async function AdminLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Fetch all leaderboard entries for admin
  const entries = await fetchLeaderboard()

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Leaderboard — All Rankings</h1>
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">View the complete rankings for all users across the platform.</p>
      </div>
      
      <LeaderboardTable entries={entries} />
    </div>
  )
}
