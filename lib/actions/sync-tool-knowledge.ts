'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Only gemini-3.5-flash works on this API key (live-tested 2026-08-23).
const GEMINI_MODEL = 'gemini-3.5-flash'

async function generateKnowledgeSummary(tool: {
  name: string
  description?: string | null
  pricing?: string | null
  best_for?: string | null
  features?: string[] | null
}): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  const featuresStr = tool.features?.length ? `Features: ${tool.features.join(', ')}` : ''
  const prompt = `Generate a concise 3-5 sentence knowledge summary for the sales tool "${tool.name}".
${tool.description ? `Description: ${tool.description}` : ''}
${tool.pricing ? `Pricing: ${tool.pricing}` : ''}
${tool.best_for ? `Best for: ${tool.best_for}` : ''}
${featuresStr}

This summary is for internal AI context only — not customer-facing. Cover key facts about this tool that a salesman needs to know (pricing, policies, features, what it does). Write in Hinglish style. Return ONLY the summary text, no JSON, no markdown.`

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }], role: 'user' }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
  })

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) return null
    const data = await res.json()
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text?.trim()) return text.trim()
  } catch {
    // fire-and-forget — swallow errors silently
  }
  return null

}

/**
 * Non-blocking knowledge sync — call after any FAQ/script/objection/voice note mutation.
 * Uses service role key directly, no admin session required.
 */
export async function syncToolKnowledge(toolId: string | null | undefined) {
  if (!toolId) return
  try {
    const sb = getServiceClient()
    const { data: tool } = await sb
      .from('tools')
      .select('name, description, pricing, best_for, features')
      .is('deleted_at', null)
      .eq('id', toolId)
      .single()

    if (!tool) return

    const summary = await generateKnowledgeSummary(tool)
    if (!summary) return

    await sb
      .from('tools')
      .update({ knowledge_summary: summary, updated_at: new Date().toISOString() })
      .eq('id', toolId)
  } catch (e) {
    console.warn('[SyncKnowledge] Non-fatal refresh error:', e)
  }
}
