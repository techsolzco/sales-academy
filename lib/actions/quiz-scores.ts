'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

// Audit §3 #9 — best-score tracking. Best = highest percentage; ties
// break to the most recent attempt. No new table: best score is derived
// from quiz_attempts, so it can never drift from the recorded attempts.

export interface BestScore {
  attempt_id: string
  quiz_id: string
  user_id: string
  score: number
  max_score: number
  percentage: number
  passed: boolean
  completed_at: string
}

export interface UserBestScore extends BestScore {
  user_name: string | null
  attempt_count: number
}

async function getSessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userId).single()
  return profile?.role === 'admin'
}

export async function fetchBestScore(
  quizId: string,
  userId?: string
): Promise<ActionResult<BestScore | null>> {
  const session = await getSessionUser()
  if (!session) return { error: 'Not authenticated' }
  const { supabase, user } = session

  const targetUserId = userId || user.id
  if (targetUserId !== user.id) {
    // Reading another user's best score is admin-only.
    if (!(await isAdmin(supabase, user.id))) return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, quiz_id, user_id, score, max_score, percentage, passed, completed_at')
    .eq('quiz_id', quizId)
    .eq('user_id', targetUserId)
    .order('percentage', { ascending: false })
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { data: null }

  return {
    data: {
      attempt_id: data.id,
      quiz_id: data.quiz_id,
      user_id: data.user_id,
      score: Number(data.score),
      max_score: Number(data.max_score),
      percentage: Number(data.percentage),
      passed: data.passed,
      completed_at: data.completed_at,
    },
  }
}

export async function fetchQuizBestScores(
  quizId: string
): Promise<ActionResult<UserBestScore[]>> {
  const session = await getSessionUser()
  if (!session) return { error: 'Not authenticated' }
  const { supabase, user } = session

  if (!(await isAdmin(supabase, user.id))) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, quiz_id, user_id, score, max_score, percentage, passed, completed_at, user:profiles(full_name)')
    .eq('quiz_id', quizId)
    .order('percentage', { ascending: false })
    .order('completed_at', { ascending: false })

  if (error) return { error: error.message }

  // One row per user: rows arrive best-first, so the first row per
  // user_id is that user's best attempt; later rows only add to the count.
  const bestByUser = new Map<string, UserBestScore>()
  for (const row of data || []) {
    const existing = bestByUser.get(row.user_id)
    if (existing) {
      existing.attempt_count += 1
      continue
    }
    bestByUser.set(row.user_id, {
      attempt_id: row.id,
      quiz_id: row.quiz_id,
      user_id: row.user_id,
      score: Number(row.score),
      max_score: Number(row.max_score),
      percentage: Number(row.percentage),
      passed: row.passed,
      completed_at: row.completed_at,
      user_name: (row.user as any)?.full_name ?? null,
      attempt_count: 1,
    })
  }

  return {
    data: Array.from(bestByUser.values()).sort((a, b) => b.percentage - a.percentage),
  }
}
