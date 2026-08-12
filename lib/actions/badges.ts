'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Badge } from '@/types'

export async function checkAndAwardBadge(userId: string, slug: string): Promise<void> {
  try {
    const supabase = await createClient()

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
    const { error } = await supabase
      .from('user_badges')
      .insert({ user_id: userId, badge_id: badge.id })

    if (!error) {
      // Notify the user about the new badge
      await supabase.from('notifications').insert({
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
  const supabase = await createClient()

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
