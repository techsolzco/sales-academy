'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, LeaderboardEntry } from '@/types'

// ─── Scoring — single source of truth ────────────────────────────────────────
// NOTE (B67): there is intentionally NO scoring-weights constant in this file.
// The leaderboard formula lives ONLY in the SQL function `get_leaderboard()`
// (supabase/migrations/006_phase6.sql — courseCompleted 300 / lessonCompleted
// 10 / scriptCopied 50, as of the audit). The old LEADERBOARD_WEIGHTS constant
// was dead code: nothing ever read it, so editing it changed nothing. To
// change the scoring, change the SQL function — do not re-add a TS constant
// unless it is actually wired into the code path that computes the score.
//
// B10: fetchLeaderboard calls .rpc('get_leaderboard') with no arguments and
// expects the columns user_id, full_name, avatar_url, courses_completed,
// lessons_completed, scripts_copied, score (rank is derived client-side
// below). Any rewrite of the SQL function must keep this name, signature
// and column set, or this file and its callers must be updated with it.

export async function fetchLeaderboard(): Promise<ActionResult<LeaderboardEntry[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_leaderboard')

  // B68: never silently return [] on failure — surface the error in the
  // ActionResult shape so the UI can show an honest error state instead of
  // an empty leaderboard. Callers must handle { error } (see
  // app/admin/leaderboard/page.tsx and app/dashboard/leaderboard/page.tsx,
  // which still expect a plain array and need updating to match).
  if (error) return { error: error.message }
  if (!data) return { error: 'Leaderboard returned no data' }

  return {
    data: data.map((entry: any, index: number) => ({
      ...entry,
      rank: index + 1
    }))
  }
}

export async function fetchMyRank(userId?: string): Promise<{ rank: number; entry: LeaderboardEntry } | null> {
  // B26: never accept an arbitrary userId. The target user is derived from
  // the session; an explicit userId is honoured ONLY when the caller is an
  // admin (e.g. View-as-Student previews). A non-admin passing someone
  // else's id gets a Forbidden error instead of that user's rank.
  // (There is no shared requireAuth helper in lib/ — each action file defines
  // its own requireAdmin; this follows the same inline pattern.)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let targetUserId = user.id
  if (userId && userId !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') throw new Error('Forbidden')
    targetUserId = userId
  }

  const result = await fetchLeaderboard()
  if (result.error || !result.data) return null

  const entry = result.data.find(e => e.user_id === targetUserId)
  if (!entry) return null

  return {
    rank: entry.rank,
    entry
  }
}
