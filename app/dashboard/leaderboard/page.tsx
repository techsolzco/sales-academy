import { createClient } from '@/lib/supabase/server'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { fetchLeaderboard } from '@/lib/actions/leaderboard'

export const metadata = {
  title: 'Leaderboard 🏆 | Sales Academy',
}

export default async function DashboardLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const entries = await fetchLeaderboard()

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard 🏆</h1>
        <p className="text-gray-500 mt-1">See how you rank against other sales professionals.</p>
      </div>
      
      <LeaderboardTable entries={entries} currentUserId={user.id} />
    </div>
  )
}
