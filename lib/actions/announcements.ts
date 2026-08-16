'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export interface Announcement {
  id: string
  title: string
  body: string
  attachment_url: string | null
  attachment_name: string | null
  target_role: 'all' | 'salesman' | 'admin'
  is_published: boolean
  created_at: string
  updated_at: string
  profile?: { full_name: string | null } | null
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function fetchAnnouncements(publishedOnly = false): Promise<Announcement[]> {
  const supabase = await createClient()
  let q = supabase
    .from('announcements')
    .select('*, profile:profiles(full_name)')
    .order('created_at', { ascending: false })
  if (publishedOnly) q = q.eq('is_published', true)
  const { data } = await q
  return (data ?? []) as Announcement[]
}

export async function createAnnouncement(input: {
  title: string
  body: string
  attachment_url?: string | null
  attachment_name?: string | null
  target_role?: 'all' | 'salesman' | 'admin'
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin()
    const { error } = await supabase.from('announcements').insert({
      title: input.title,
      body: input.body,
      attachment_url: input.attachment_url || null,
      attachment_name: input.attachment_name || null,
      target_role: input.target_role || 'all',
      created_by: user.id,
    })
    if (error) throw error
    revalidatePath('/admin/announcements')
    revalidatePath('/dashboard/announcements')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}

export async function updateAnnouncement(id: string, input: {
  title?: string
  body?: string
  attachment_url?: string | null
  attachment_name?: string | null
  target_role?: string
  is_published?: boolean
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('announcements')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/announcements')
    revalidatePath('/dashboard/announcements')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/announcements')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}

export async function markAnnouncementRead(announcementId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('announcement_reads').upsert(
    { announcement_id: announcementId, user_id: user.id },
    { onConflict: 'announcement_id,user_id' }
  )
}
