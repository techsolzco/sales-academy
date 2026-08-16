'use server'

import { getAiTrainingSettings } from '@/lib/actions/ai-assist'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

function getServiceClient() {
  const { createClient: sc } = require('@supabase/supabase-js')
  return sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest']
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 2500

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not configured')
  let lastError = 'AI unavailable'
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }], role: 'user' }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192, responseMimeType: 'application/json' },
        }),
      })
      if (response.status === 429 || response.status === 503 || response.status === 500) { lastError = `${model} busy`; continue }
      if (response.status === 404 || response.status === 403) { lastError = `${model} unavailable`; continue }
      if (!response.ok) throw new Error(`AI error ${response.status}`)
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) { lastError = 'Empty response'; continue }
      return text
    }
    if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
  }
  throw new Error(lastError)
}

export interface BulkGenerateResult {
  faqs: Array<{ question: string; short_answer: string; detailed_answer: string; category: string }>
  objections: Array<{ objection_text: string; response_text: string; category: string; severity: string }>
  scripts: Array<{ title: string; script_type: string; content: string; when_to_use: string }>
}

export async function generateTrainingPackage(toolId: string, toolName: string, description: string): Promise<ActionResult<BulkGenerateResult>> {
  try {
    await requireAdmin()
    const settings = await getAiTrainingSettings()
    
    const systemContext = settings ? `${settings.persona_instructions}\n${settings.sales_style_rules}\n${settings.tone_examples}` : ''
    
    const prompt = `${systemContext}

You are generating a complete sales training package for the product: "${toolName}".
Product description: ${description}

Generate a JSON object with exactly this structure:
{
  "faqs": [ // 20 items
    { "question": "...", "short_answer": "...", "detailed_answer": "...", "category": "General|Features|Pricing|Support|Technical" }
  ],
  "objections": [ // 5 items
    { "objection_text": "...", "response_text": "...", "category": "price|quality|timing|competition|trust", "severity": "low|medium|high" }
  ],
  "scripts": [ // 3 items
    { "title": "...", "script_type": "whatsapp|greeting|follow_up", "content": "...", "when_to_use": "..." }
  ]
}

Write all content in Hinglish (Roman Urdu + English mix). Make it specific to ${toolName}. Return ONLY the JSON object, no other text.`

    const rawJson = await callGemini(prompt)
    const cleaned = rawJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()
    const result: BulkGenerateResult = JSON.parse(cleaned)
    
    return { data: result }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function saveBulkPackage(
  toolId: string,
  result: BulkGenerateResult,
  publishAll: boolean
): Promise<ActionResult<{ saved: number }>> {
  try {
    const { supabase } = await requireAdmin()
    const status = publishAll ? 'published' : 'draft'
    let saved = 0

    // Save FAQs
    if (result.faqs?.length) {
      const { error } = await supabase.from('faqs').insert(
        result.faqs.map(f => ({ ...f, status, tool_id: toolId, priority: 0 }))
      )
      if (!error) saved += result.faqs.length
    }

    // Save Objections
    if (result.objections?.length) {
      const { error } = await supabase.from('objections').insert(
        result.objections.map(o => ({ ...o, status, tool_id: toolId }))
      )
      if (!error) saved += result.objections.length
    }

    // Save Scripts
    if (result.scripts?.length) {
      const { error } = await supabase.from('scripts').insert(
        result.scripts.map(s => ({ ...s, status, tool_id: toolId, language: 'Hinglish', tags: [] }))
      )
      if (!error) saved += result.scripts.length
    }

    revalidatePath('/admin/faqs')
    revalidatePath('/admin/scripts')
    revalidatePath('/admin/objections')
    return { data: { saved } }
  } catch (e: any) {
    return { error: e.message }
  }
}
