'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAppSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('app_settings').select('*').limit(1).single()
  if (error) {
    return { welcome_message_template: 'Welcome {name}! We are excited to have you join the Sales Academy.' }
  }
  return data
}

export async function updateWelcomeMessage(template: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')

  const { data: settings, error } = await supabase.from('app_settings').select('id').limit(1).single()
  
  if (error && error.code === '42P01') {
    // Table doesn't exist yet, ignore
    console.warn('app_settings table does not exist, skipping update')
  } else if (settings) {
    await supabase.from('app_settings').update({ welcome_message_template: template }).eq('id', settings.id)
  }
  revalidatePath('/admin/settings')
}

export async function markWelcomeSeen() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // We also use localStorage on the client, but try to sync with DB if column exists
  await supabase.from('profiles').update({ has_seen_welcome: true }).eq('id', user.id)
  revalidatePath('/dashboard')
}
