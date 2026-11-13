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

// ─── Activity streaks (audit §3 #13, MEDIUM) ───────────────────────────────
// A "day with activity" is any day the user completed a lesson, attempted a
// quiz, or submitted an assignment. Dates are computed from the three
// timestamp columns (lesson_progress.completed_at, quiz_attempts.completed_at,
// assignment_submissions.submitted_at — that table has no created_at column)
// and walked backwards from today, so the work is one small date-only query
// per source, not a row-per-day scan.

export interface ActivityStreak {
  user_id: string
  current_streak: number
  longest_streak: number
}

function toDayString(value: string): string {
  return new Date(value).toISOString().slice(0, 10)
}

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export async function fetchActivityStreak(userId?: string): Promise<ActionResult<ActivityStreak>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // An explicit userId is honoured ONLY for admins (same pattern as
    // fetchMyRank above); a non-admin asking for someone else's streak gets
    // a Forbidden error instead of that user's data.
    let targetUserId = user.id
    if (userId && userId !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'admin') return { error: 'Forbidden' }
      targetUserId = userId
    }

    // Distinct activity dates only, most recent first. 2000 rows per source
    // is far more than any real streak needs (a 5-year daily streak is
    // ~1825 days) while keeping the payload small.
    const [progressRes, attemptsRes, submissionsRes] = await Promise.all([
      supabase
        .from('lesson_progress')
        .select('completed_at')
        .eq('user_id', targetUserId)
        .eq('completed', true)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(2000),
      supabase
        .from('quiz_attempts')
        .select('completed_at')
        .eq('user_id', targetUserId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(2000),
      supabase
        .from('assignment_submissions')
        .select('submitted_at')
        .eq('user_id', targetUserId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(2000),
    ])
    const firstError = progressRes.error ?? attemptsRes.error ?? submissionsRes.error
    if (firstError) return { error: firstError.message }

    const activeDays = new Set<string>()
    for (const row of (progressRes.data ?? []) as { completed_at: string }[]) {
      activeDays.add(toDayString(row.completed_at))
    }
    for (const row of (attemptsRes.data ?? []) as { completed_at: string }[]) {
      activeDays.add(toDayString(row.completed_at))
    }
    for (const row of (submissionsRes.data ?? []) as { submitted_at: string }[]) {
      activeDays.add(toDayString(row.submitted_at))
    }

    if (activeDays.size === 0) {
      return { data: { user_id: targetUserId, current_streak: 0, longest_streak: 0 } }
    }

    // Longest streak: walk the sorted distinct days once, counting runs.
    const sortedDays = Array.from(activeDays).sort().reverse()
    let longest = 1
    let run = 1
    for (let i = 1; i < sortedDays.length; i++) {
      if (addDays(sortedDays[i - 1], -1) === sortedDays[i]) {
        run += 1
        if (run > longest) longest = run
      } else {
        run = 1
      }
    }

    // Current streak: consecutive days ending today. If there is no activity
    // today yet, the streak is still alive when yesterday was active
    // (yesterday is the last counted day); otherwise it is 0.
    const today = new Date().toISOString().slice(0, 10)
    let current = 0
    let cursor = activeDays.has(today) ? today : addDays(today, -1)
    if (activeDays.has(cursor)) {
      while (activeDays.has(cursor)) {
        current += 1
        cursor = addDays(cursor, -1)
      }
    }

    return { data: { user_id: targetUserId, current_streak: current, longest_streak: longest } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
