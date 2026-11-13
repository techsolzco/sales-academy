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
  publish_at: string | null
  expires_at: string | null
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

/** Normalize a nullable ISO datetime input: blank -> null, invalid -> error. */
function normalizeSchedule(input: { publish_at?: string | null; expires_at?: string | null }):
  | { publish_at: string | null; expires_at: string | null }
  | { error: string } {
  const publish_at = input.publish_at?.trim() ? input.publish_at.trim() : null
  const expires_at = input.expires_at?.trim() ? input.expires_at.trim() : null
  if (publish_at && Number.isNaN(Date.parse(publish_at))) return { error: 'Invalid publish date/time.' }
  if (expires_at && Number.isNaN(Date.parse(expires_at))) return { error: 'Invalid expiry date/time.' }
  if (publish_at && expires_at && new Date(expires_at) <= new Date(publish_at)) {
    return { error: 'Expiry must be after the publish date/time.' }
  }
  return { publish_at, expires_at }
}

/**
 * Staff-facing fetch: only announcements visible RIGHT NOW — published and
 * inside their schedule window (publish_at null or reached, expires_at null
 * or not yet passed). Target-role filtering is unchanged (not applied here;
 * the dashboard shows all visible announcements).
 */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('announcements')
    .select('*, profile:profiles(full_name)')
    .eq('is_published', true)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
  return (data ?? []) as Announcement[]
}

/** Admin fetch: ALL announcements, including drafts, scheduled and expired. */
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('announcements')
    .select('*, profile:profiles(full_name)')
    .order('created_at', { ascending: false })
  return (data ?? []) as Announcement[]
}

export async function createAnnouncement(input: {
  title: string
  body: string
  attachment_url?: string | null
  attachment_name?: string | null
  target_role?: 'all' | 'salesman' | 'admin'
  publish_at?: string | null
  expires_at?: string | null
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin()
    const schedule = normalizeSchedule(input)
    if ('error' in schedule) return { error: schedule.error }
    const { error } = await supabase.from('announcements').insert({
      title: input.title,
      body: input.body,
      attachment_url: input.attachment_url || null,
      attachment_name: input.attachment_name || null,
      target_role: input.target_role || 'all',
      publish_at: schedule.publish_at,
      expires_at: schedule.expires_at,
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
  publish_at?: string | null
  expires_at?: string | null
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const update: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() }
    // Validate the merged schedule when either end of the window changes.
    if (input.publish_at !== undefined || input.expires_at !== undefined) {
      const { data: current } = await supabase
        .from('announcements')
        .select('publish_at, expires_at')
        .eq('id', id)
        .single()
      if (!current) return { error: 'Announcement not found.' }
      const schedule = normalizeSchedule({
        publish_at: input.publish_at !== undefined ? input.publish_at : current.publish_at,
        expires_at: input.expires_at !== undefined ? input.expires_at : current.expires_at,
      })
      if ('error' in schedule) return { error: schedule.error }
      update.publish_at = schedule.publish_at
      update.expires_at = schedule.expires_at
    }
    const { error } = await supabase.from('announcements')
      .update(update)
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
    revalidatePath('/dashboard/announcements')
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
