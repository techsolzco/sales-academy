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

/**
 * Generates a comprehensive knowledge summary by reading the tool's metadata
 * AND all linked FAQs, scripts, objections, and voice notes.
 * This is the core improvement: previous version only used tool metadata.
 */
async function generateKnowledgeSummary(
  tool: { name: string; description?: string | null; pricing?: string | null; best_for?: string | null; features?: string[] | null },
  faqs: Array<{ question: string; short_answer: string }>,
  scripts: Array<{ title: string; content: string }>,
  objections: Array<{ objection_text: string; recommended_response: string }>,
  voiceNotes: Array<{ title: string; transcript: string }>
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  // Build a rich context from ALL tool content
  const sections: string[] = []

  // Tool basics
  sections.push(`Tool Name: ${tool.name}`)
  if (tool.description) sections.push(`Description: ${tool.description}`)
  if (tool.pricing) sections.push(`Pricing: ${tool.pricing}`)
  if (tool.best_for) sections.push(`Best For: ${tool.best_for}`)
  if (tool.features?.length) sections.push(`Key Features: ${tool.features.join(', ')}`)

  // FAQs — these contain the most useful customer-facing knowledge
  if (faqs.length > 0) {
    sections.push('\n--- FAQs (Questions customers ask) ---')
    faqs.forEach(f => sections.push(`Q: ${f.question}\nA: ${f.short_answer}`))
  }

  // Objections — key selling challenge responses
  if (objections.length > 0) {
    sections.push('\n--- Common Objections ---')
    objections.forEach(o => sections.push(`Objection: ${o.objection_text}\nResponse: ${o.recommended_response}`))
  }

  // Scripts — selling approach and messaging
  if (scripts.length > 0) {
    sections.push('\n--- Sales Scripts ---')
    scripts.forEach(s => sections.push(`${s.title}: ${s.content.slice(0, 200)}`))
  }

  // Voice notes
  if (voiceNotes.length > 0) {
    sections.push('\n--- Voice Note Topics ---')
    voiceNotes.forEach(v => sections.push(`${v.title}: ${v.transcript.slice(0, 150)}`))
  }

  const contentBlock = sections.join('\n')

  const prompt = `You are creating an internal AI knowledge summary for a sales training platform. 
Below is ALL the content we have about the tool "${tool.name}" — including its metadata, FAQs, objection responses, sales scripts, and voice notes.

${contentBlock}

Based on ALL of the above content, write a comprehensive 5-8 sentence knowledge summary that covers:
1. What the tool is and what it does
2. Exact pricing and any free/student offers
3. Key features and selling points
4. Common customer concerns and how to address them
5. Any warranty, refund, or policy details mentioned in the FAQs

This summary will be used by an AI assistant to answer salesman questions — it must contain specific facts, numbers, and policies, NOT vague descriptions. Write in plain English. Return ONLY the summary text, no JSON, no markdown formatting.`

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }], role: 'user' }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  })

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) {
      console.warn(`[SyncKnowledge] Gemini returned ${res.status}`)
      return null
    }
    const data = await res.json()
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text?.trim()) return text.trim()
  } catch (e) {
    console.warn('[SyncKnowledge] Gemini call failed:', e)
  }
  return null
}

/**
 * Non-blocking knowledge sync — call after any FAQ/script/objection/voice note mutation.
 * Uses service role key directly, no admin session required.
 * 
 * RESPECTS MANUAL EDITS: If knowledge_summary_source = 'manual', 
 * this function will NOT overwrite the summary. The admin chose to manually
 * edit it, and auto-sync should not silently replace their work.
 */
export async function syncToolKnowledge(toolId: string | null | undefined) {
  if (!toolId) return
  try {
    const sb = getServiceClient()
    
    // Check if this tool has a manually edited summary — if so, skip auto-sync
    const { data: tool } = await sb
      .from('tools')
      .select('id, name, description, pricing, best_for, features, knowledge_summary_source')
      .is('deleted_at', null)
      .eq('id', toolId)
      .single()

    if (!tool) return

    // Respect manual edits — don't overwrite
    if (tool.knowledge_summary_source === 'manual') {
      console.log(`[SyncKnowledge] Skipping auto-sync for "${tool.name}" — manually edited`)
      return
    }

    // Fetch ALL linked content for this tool
    const [faqsRes, scriptsRes, objectionsRes, voiceNotesRes] = await Promise.all([
      sb.from('faqs').select('question, short_answer').eq('tool_id', toolId).is('deleted_at', null),
      sb.from('scripts').select('title, content').eq('tool_id', toolId).is('deleted_at', null),
      sb.from('objections').select('objection_text, recommended_response').eq('tool_id', toolId).is('deleted_at', null),
      sb.from('voice_notes').select('title, transcript').eq('tool_id', toolId).is('deleted_at', null),
    ])

    const faqs = faqsRes.data ?? []
    const scripts = scriptsRes.data ?? []
    const objections = objectionsRes.data ?? []
    const voiceNotes = voiceNotesRes.data ?? []

    console.log(`[SyncKnowledge] Generating summary for "${tool.name}": ${faqs.length} FAQs, ${scripts.length} scripts, ${objections.length} objections, ${voiceNotes.length} voice notes`)

    const summary = await generateKnowledgeSummary(tool, faqs, scripts, objections, voiceNotes)
    if (!summary) return

    await sb
      .from('tools')
      .update({
        knowledge_summary: summary,
        knowledge_summary_source: 'auto',
        knowledge_summary_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', toolId)

    console.log(`[SyncKnowledge] Summary updated for "${tool.name}" (${summary.length} chars)`)
  } catch (e) {
    console.warn('[SyncKnowledge] Non-fatal refresh error:', e)
  }
}
