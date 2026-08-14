'use server'

import { createClient } from '@/lib/supabase/server'
import { LeaderboardEntry } from '@/types'

// SCORING WEIGHTS — adjust these values to change the leaderboard formula
const LEADERBOARD_WEIGHTS = {
  courseCompleted: 300,  // points per fully completed course
  lessonCompleted: 10,   // points per individual lesson completed
  scriptCopied: 50,      // points per script copied
} as const

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('get_leaderboard')
    
  if (error || !data) return []
  
  return data.map((entry: any, index: number) => ({
    ...entry,
    rank: index + 1
  }))
}

export async function fetchMyRank(userId: string): Promise<{ rank: number; entry: LeaderboardEntry } | null> {
  const leaderboard = await fetchLeaderboard()
  
  const entry = leaderboard.find(e => e.user_id === userId)
  if (!entry) return null
  
  return {
    rank: entry.rank,
    entry
  }
}
