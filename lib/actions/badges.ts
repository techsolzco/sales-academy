'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Badge } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, isAdmin: profile?.role === 'admin' }
}

// Badge slugs seeded in migration 004_phase4.sql. Each slug maps to a
// condition verified server-side here — a caller can never award a badge
// the user has not actually earned, and can never award to another user
// unless they are an admin.
async function hasEarned(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  userId: string,
  slug: string
): Promise<boolean> {
  switch (slug) {
    case 'first_lesson': {
      const { data } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('completed', true)
        .limit(1)
      return !!data?.length
    }
    case 'first_course':
    case 'five_courses': {
      // Distinct courses whose every non-deleted lesson the user completed.
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, modules!inner(course_id)')
        .is('deleted_at', null)
      if (!lessons?.length) return false
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true)
      const completed = new Set((progress ?? []).map(p => p.lesson_id))
      const byCourse = new Map<string, string[]>()
      for (const l of lessons as any[]) {
        const courseId = l.modules?.course_id as string | undefined
        if (!courseId) continue
        const list = byCourse.get(courseId) ?? []
        list.push(l.id)
        byCourse.set(courseId, list)
      }
      let fullyDone = 0
      for (const ids of Array.from(byCourse.values())) {
        if (ids.length > 0 && ids.every(id => completed.has(id))) fullyDone++
      }
      return slug === 'first_course' ? fullyDone >= 1 : fullyDone >= 5
    }
    case 'first_script_copy': {
      const { data } = await supabase
        .from('script_copies')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
      return !!data?.length
    }
    case 'first_post': {
      const { data } = await supabase
        .from('community_posts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .limit(1)
      return !!data?.length
    }
    default:
      // Unknown slug — never award.
      return false
  }
}

export async function checkAndAwardBadge(userId: string, slug: string): Promise<void> {
  try {
    const { supabase, user, isAdmin } = await requireAuth()

    // Only the user themselves (earning their own badge via lesson / post /
    // script-copy flows) or an admin may trigger an award for userId.
    if (userId !== user.id && !isAdmin) return

    // Verify the earning condition server-side before inserting.
    if (!(await hasEarned(supabase, userId, slug))) return

    // Get badge by slug
    const { data: badge } = await supabase
      .from('badges')
      .select('id, name')
      .eq('slug', slug)
      .single()

    if (!badge) return

    // Check if user already has it
    const { data: existing } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .maybeSingle()

    if (existing) return

    // Insert badge (upsert to avoid race conditions)
    // S7 / migration 035: user_badges INSERT is admin-only, so the anon
    // client insert fails RLS. The award condition was verified
    // server-side above (hasEarned) and the caller may only award their
    // own badge (or an admin may award any), so the writes go through
    // the service client — never with caller-supplied data.
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('user_badges')
      .insert({ user_id: userId, badge_id: badge.id })

    if (!error) {
      // Notify the user about the new badge (same service client: the
      // award was already verified, and the recipient is the awardee).
      await adminClient.from('notifications').insert({
        user_id: userId,
        title: `🏅 New Badge Earned: ${badge.name}!`,
        body: `Congratulations! You just unlocked the "${badge.name}" badge.`,
        type: 'badge',
        link: '/dashboard/profile',
      })
      revalidatePath('/dashboard/profile')
    }
  } catch {
    // Badge award failures should never crash the main flow
  }
}

export async function fetchUserBadges(
  userId: string
): Promise<{ badge: Badge; earned_at: string | null }[]> {
  const { supabase, user, isAdmin } = await requireAuth()

  // A user may only view their own badges; admins may view anyone's.
  if (userId !== user.id && !isAdmin) return []

  const [allBadgesRes, userBadgesRes] = await Promise.all([
    supabase.from('badges').select('*').order('created_at'),
    supabase.from('user_badges').select('*').eq('user_id', userId),
  ])

  if (!allBadgesRes.data) return []

  return allBadgesRes.data.map((badge) => {
    const earned = (userBadgesRes.data ?? []).find((ub) => ub.badge_id === badge.id)
    return {
      badge: badge as Badge,
      earned_at: earned ? earned.earned_at : null,
    }
  })
}
