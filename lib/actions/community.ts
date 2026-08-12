'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, CommunityPost } from '@/types'
import { checkAndAwardBadge } from './badges'

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('community_posts')
    .select(`
      *,
      profile:profiles(id, full_name, avatar_url, role),
      replies:community_replies(
        id, post_id, user_id, content, is_deleted, created_at,
        profile:profiles(id, full_name, avatar_url, role)
      )
    `)
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as CommunityPost[]
}

export async function createPost(
  content: string,
  postType: string = 'general'
): Promise<ActionResult<CommunityPost>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('community_posts')
    .insert({ content, post_type: postType, user_id: user.id })
    .select(`
      *,
      profile:profiles(id, full_name, avatar_url, role)
    `)
    .single()

  if (error) return { error: error.message }

  // Award first_post badge (fire & forget)
  checkAndAwardBadge(user.id, 'first_post').catch(() => {})

  revalidatePath('/dashboard/community')
  revalidatePath('/admin/community')
  return { data: data as CommunityPost }
}

export async function createReply(
  postId: string,
  content: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('community_replies')
    .insert({ post_id: postId, content, user_id: user.id })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/community')
  revalidatePath('/admin/community')
  return { data: undefined }
}

export async function pinPost(postId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  // Toggle pin
  const { data: post } = await supabase
    .from('community_posts')
    .select('is_pinned')
    .eq('id', postId)
    .single()

  const { error } = await supabase
    .from('community_posts')
    .update({ is_pinned: !(post?.is_pinned ?? false) })
    .eq('id', postId)

  if (error) return { error: error.message }
  revalidatePath('/admin/community')
  return { data: undefined }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  // Admin can delete any; user can only delete own
  let query = supabase.from('community_posts').update({ is_deleted: true }).eq('id', postId)
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id)
  }

  const { error } = await query
  if (error) return { error: error.message }

  revalidatePath('/dashboard/community')
  revalidatePath('/admin/community')
  return { data: undefined }
}

export async function deleteReply(replyId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  let query = supabase.from('community_replies').update({ is_deleted: true }).eq('id', replyId)
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id)
  }

  const { error } = await query
  if (error) return { error: error.message }

  revalidatePath('/dashboard/community')
  return { data: undefined }
}
