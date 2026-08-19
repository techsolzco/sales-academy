'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function upsertSalesmanRecording(voiceNoteId: string, audioUrl: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('salesman_voice_recordings')
    .upsert({ voice_note_id: voiceNoteId, user_id: user.id, audio_url: audioUrl, updated_at: new Date().toISOString() }, { onConflict: 'voice_note_id,user_id' })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/voice-notes')
  return { data: undefined }
}

export async function getMySalesmanRecording(voiceNoteId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('salesman_voice_recordings')
    .select('audio_url')
    .eq('voice_note_id', voiceNoteId)
    .eq('user_id', user.id)
    .maybeSingle()
  return data?.audio_url ?? null
}

export async function toggleAdminAudioVisibility(voiceNoteId: string, visible: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  const sb = getServiceClient()
  const { error } = await sb.from('voice_notes').update({ admin_audio_visible: visible }).eq('id', voiceNoteId)
  if (error) return { error: error.message }
  revalidatePath('/admin/voice-notes')
  revalidatePath('/dashboard/voice-notes')
  return { data: undefined }
}

