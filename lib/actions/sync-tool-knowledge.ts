'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Builds a comprehensive knowledge summary by concatenating the tool's metadata
 * AND all linked FAQs, scripts, objections, and voice notes — NO AI call needed.
 * 
 * This is intentionally NOT an AI-generated summary. It's a structured dump of all
 * content so that Ask AI always has complete, up-to-date context. The admin can
 * click "Regenerate AI Knowledge" on the Tool Tree page if they want a polished
 * AI-written version.
 * 
 * Why no Gemini call? Because:
 * 1. Fire-and-forget sync happens on every FAQ/script/objection create/update/delete
 * 2. The free Gemini tier has strict RPM limits → frequent 429 failures
 * 3. A 429 silently drops the sync, leaving stale summaries
 * 4. Raw content is actually MORE useful to the AI than a summary-of-a-summary
 */
function buildKnowledgeSummary(
  tool: { name: string; description?: string | null; pricing?: string | null; best_for?: string | null; features?: string[] | null },
  faqs: Array<{ question: string; short_answer: string }>,
  scripts: Array<{ title: string; content: string }>,
  objections: Array<{ objection_text: string; recommended_response: string; meaning?: string | null; do_not_say?: string | null }>,
  voiceNotes: Array<{ title: string; transcript: string | null }>
): string {
  const parts: string[] = []

  // Tool basics
  parts.push(`${tool.name} — Key Facts:`)
  if (tool.description) parts.push(`About: ${tool.description}`)
  if (tool.pricing) parts.push(`Pricing: ${tool.pricing}`)
  if (tool.best_for) parts.push(`Best for: ${tool.best_for}`)
  if (tool.features?.length) parts.push(`Features: ${tool.features.join(', ')}`)

  // FAQs — most useful for Ask AI
  if (faqs.length > 0) {
    parts.push('')
    parts.push('Frequently Asked Questions:')
    faqs.forEach(f => parts.push(`Q: ${f.question}\nA: ${f.short_answer}`))
  }

  // Objections
  if (objections.length > 0) {
    parts.push('')
    parts.push('Common Objections & Responses:')
    objections.forEach(o => {
      let objStr = `Objection: ${o.objection_text}`
      if (o.meaning) objStr += ` (Meaning: ${o.meaning})`
      objStr += `\nRecommended Response: ${o.recommended_response}`
      if (o.do_not_say) objStr += `\nDO NOT SAY: ${o.do_not_say} (Strict Rule)`
      parts.push(objStr)
    })
  }

  // Scripts (truncated to keep summary manageable)
  if (scripts.length > 0) {
    parts.push('')
    parts.push('Sales Scripts:')
    scripts.forEach(s => parts.push(`${s.title}: ${s.content.slice(0, 300)}`))
  }

  // Voice notes
  if (voiceNotes.length > 0) {
    parts.push('')
    parts.push('Voice Note Topics:')
    voiceNotes.forEach(v => {
      const transcript = v.transcript ? v.transcript.slice(0, 200) : '(no transcript)'
      parts.push(`${v.title}: ${transcript}`)
    })
  }

  return parts.join('\n')
}

/**
 * Non-blocking knowledge sync — call after any FAQ/script/objection/voice note mutation.
 * Uses service role key directly, no admin session required.
 * 
 * NO GEMINI CALL — just concatenates raw content. Instant and reliable.
 * 
 * RESPECTS MANUAL EDITS: If knowledge_summary_source = 'manual', 
 * this function will NOT overwrite the summary.
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
      sb.from('objections').select('objection_text, recommended_response, meaning, do_not_say').eq('tool_id', toolId).is('deleted_at', null),
      sb.from('voice_notes').select('title, transcript').eq('tool_id', toolId).is('deleted_at', null),
    ])

    const faqs = faqsRes.data ?? []
    const scripts = scriptsRes.data ?? []
    const objections = objectionsRes.data ?? []
    const voiceNotes = voiceNotesRes.data ?? []

    // Build summary from raw content — no Gemini call
    const summary = buildKnowledgeSummary(tool, faqs, scripts, objections, voiceNotes)

    console.log(`[SyncKnowledge] Updated "${tool.name}": ${faqs.length} FAQs, ${scripts.length} scripts, ${objections.length} objections, ${voiceNotes.length} voice notes → ${summary.length} chars`)

    await sb
      .from('tools')
      .update({
        knowledge_summary: summary,
        knowledge_summary_source: 'auto',
        knowledge_summary_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', toolId)
  } catch (e) {
    console.warn('[SyncKnowledge] Non-fatal error:', e)
  }
}
