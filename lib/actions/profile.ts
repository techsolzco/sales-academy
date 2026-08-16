'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResult } from '@/types'
import { Lang } from '@/lib/i18n/translations'

export async function fetchPreferences(): Promise<{ language: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { language: 'en' }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('language')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return { language: 'en' }
  
  return { language: data.language }
}

export async function upsertPreferences(language: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, language }, { onConflict: 'user_id' })

  if (error) return { error: error.message }
  return { data: undefined }
}

export async function updateAvatar(avatarUrl: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { data: undefined }
}

export async function updateProfile(data: { full_name?: string; bio?: string; phone?: string }): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { error: error.message }
  return { data: undefined }
}
