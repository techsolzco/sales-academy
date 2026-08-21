'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, VoiceNote, Status } from '@/types'
import { syncToolKnowledge } from './sync-tool-knowledge'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

export interface VoiceNoteInput {
  title: string
  audio_url: string
  transcript?: string
  purpose?: string
  when_to_send?: string
  related_lesson_id?: string
  language?: string
  duration_seconds?: number
  key_points?: string[]
  status?: Status
  tool_id?: string | null
}

export async function createVoiceNote(input: VoiceNoteInput): Promise<ActionResult<VoiceNote>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('voice_notes')
      .insert({
        ...input,
        language: input.language || 'English',
        key_points: input.key_points || [],
        status: input.status || 'draft',
        tool_id: input.tool_id || null,
      })
      .select()
      .single()
    if (error) return { error: error.message }
    
    syncToolKnowledge(data.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    
    revalidatePath('/admin/voice-notes')
    revalidatePath('/dashboard/voice-notes')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateVoiceNote(id: string, input: Partial<VoiceNoteInput>): Promise<ActionResult<VoiceNote>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('voice_notes')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    
    syncToolKnowledge(data.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    
    revalidatePath('/admin/voice-notes')
    revalidatePath('/dashboard/voice-notes')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteVoiceNote(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    
    const { data: existing } = await supabase
      .from('voice_notes')
      .select('tool_id').is('deleted_at', null)
      .eq('id', id)
      .single()
      
    const { error } = await supabase.from('voice_notes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) return { error: error.message }
    
    if (existing?.tool_id) {
      syncToolKnowledge(existing.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    }
    
    revalidatePath('/admin/voice-notes')
    revalidatePath('/dashboard/voice-notes')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function bulkSoftDeleteVoiceNotes(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('voice_notes').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/voice-notes')
    
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
