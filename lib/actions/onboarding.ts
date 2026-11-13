'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

// ─── Intern onboarding checklist (audit §3 #12, MEDIUM) ────────────────────
// Computed from existing tables only — no new table. Types are defined
// locally in this file (shared types/index.ts is not edited). Every action
// checks the session first: the target user is the session user, unless the
// caller is an admin, who may pass any userId (same pattern as
// fetchMyRank in lib/actions/leaderboard.ts).

export interface OnboardingItem {
  key: 'profile' | 'first_course' | 'first_quiz' | 'first_assignment'
  label: string
  done: boolean
}

export interface OnboardingChecklistResult {
  user_id: string
  items: OnboardingItem[]
  doneCount: number
  total: number
}

async function computeChecklist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetUserId: string
): Promise<OnboardingChecklistResult> {
  // (a) Profile complete — profiles row has full_name + phone.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', targetUserId)
    .maybeSingle()
  const profileDone = Boolean(
    (profile?.full_name as string | null)?.trim() &&
      (profile?.phone as string | null)?.trim()
  )

  // (b) First course started — any lesson_progress row for the user.
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('id')
    .eq('user_id', targetUserId)
    .limit(1)
  const courseDone = (progress?.length ?? 0) > 0

  // (c) First quiz passed — any quiz_attempts row with passed = true.
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('passed', true)
    .limit(1)
  const quizDone = (attempts?.length ?? 0) > 0

  // (d) First assignment submitted — any assignment_submissions row.
  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('id')
    .eq('user_id', targetUserId)
    .limit(1)
  const assignmentDone = (submissions?.length ?? 0) > 0

  const items: OnboardingItem[] = [
    { key: 'profile', label: 'Complete your profile (name + phone)', done: profileDone },
    { key: 'first_course', label: 'Start your first course', done: courseDone },
    { key: 'first_quiz', label: 'Pass your first quiz', done: quizDone },
    { key: 'first_assignment', label: 'Submit your first assignment', done: assignmentDone },
  ]

  return {
    user_id: targetUserId,
    items,
    doneCount: items.filter(i => i.done).length,
    total: items.length,
  }
}

async function resolveTargetUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionUserId: string,
  requestedUserId?: string
): Promise<string> {
  if (!requestedUserId || requestedUserId === sessionUserId) return sessionUserId
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionUserId)
    .maybeSingle()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return requestedUserId
}

// ── Staff: my own checklist (admin may pass any userId) ───────────────────

export async function fetchOnboardingChecklist(
  userId?: string
): Promise<ActionResult<OnboardingChecklistResult>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const targetUserId = await resolveTargetUser(supabase, user.id, userId)
    return { data: await computeChecklist(supabase, targetUserId) }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Admin: checklist status for one user ───────────────────────────────────

export async function fetchOnboardingStatus(
  userId: string
): Promise<ActionResult<OnboardingChecklistResult>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') return { error: 'Forbidden' }
    if (!userId) return { error: 'User id is required' }

    return { data: await computeChecklist(supabase, userId) }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
