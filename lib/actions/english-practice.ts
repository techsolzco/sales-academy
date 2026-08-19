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

export async function getEnglishPracticeSettings() {
  const supabase = await createClient()
  const { data } = await supabase.from('english_practice_settings').select('*').limit(1).maybeSingle()
  return data
}

export async function saveEnglishPracticeSettings(personaInstructions: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }
  
  const sb = getServiceClient()
  const { data: existing } = await sb.from('english_practice_settings').select('id').limit(1).maybeSingle()
  if (existing) {
    await sb.from('english_practice_settings').update({ persona_instructions: personaInstructions, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', existing.id)
  } else {
    await sb.from('english_practice_settings').insert({ persona_instructions: personaInstructions, updated_by: user.id })
  }
  revalidatePath('/admin/settings/english-practice')
  return { data: undefined }
}

const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest']

export async function chatWithEnglishTutor(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }>
): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const settings = await getEnglishPracticeSettings()
    const systemPrompt = settings?.persona_instructions ||
      'You are a friendly English tutor helping salespeople practice conversational English. Correct mistakes gently and keep responses short and encouraging.'

    const key = process.env.GEMINI_API_KEY!
    const contents = [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ]

    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return { data: text.trim() }
    }
    return { error: 'AI is busy, please try again.' }
  } catch (e: any) {
    return { error: e.message }
  }
}
