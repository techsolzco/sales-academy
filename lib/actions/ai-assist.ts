'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ActionResult, AiTrainingSettings, AiContentType } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

function buildSystemPrompt(settings: AiTrainingSettings, toolContext?: string) {
  let prompt = `[PERSONA]
${settings.persona_instructions}

[SALES STYLE RULES]
${settings.sales_style_rules}

IMPORTANT: Write all generated content in Hinglish — a natural mix of English and Roman Urdu (e.g. "Aap ka product bahut acha hai" style). This is the primary communication style of our sales team. Do not use pure Urdu script or pure formal English.

[LOCKED FACTS — NEVER CONTRADICT OR INVENT BEYOND THESE]
${settings.locked_facts}

[TONE & STYLE EXAMPLES]
${settings.tone_examples}`

  if (toolContext) {
    prompt += `\n\n[TOOL-SPECIFIC KNOWLEDGE — Use this information when answering about these tools]\n${toolContext}`
  }

  return prompt
}

// ── Tool knowledge retrieval ─────────────────────────────────────────────

async function fetchToolKnowledge(questionText: string): Promise<string> {
  try {
    const sb = getServiceClient()
    const { data: tools } = await sb
      .from('tools')
      .select('name, knowledge_summary').is('deleted_at', null)
      .eq('status', 'published')
      .not('knowledge_summary', 'is', null)

    if (!tools || tools.length === 0) return ''

    const q = questionText.toLowerCase()
    const matches = tools.filter(t => q.includes(t.name.toLowerCase()))

    if (matches.length === 0) return ''

    return matches
      .map(t => `### ${t.name}\n${t.knowledge_summary}`)
      .join('\n\n')
  } catch {
    return ''
  }
}

// Models tried in order — first success wins.
// Shifted to 3.7 and 3.6 as primary to help avoid high demand on older/other models.
const GEMINI_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
]

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 2500

export async function callGemini(systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server.')

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }], role: 'user' }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
    },
  })

  let lastError = 'AI request failed.'

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (response.status === 429 || response.status === 503 || response.status === 500) {
        // High demand / rate limited — try the next model in the list
        lastError = `Model ${model} is currently busy (HTTP ${response.status}).`
        continue 
      }

      if (response.status === 404 || response.status === 403) {
        // This model is unavailable for this key — try next
        const errData = await response.json().catch(() => ({}))
        lastError = (errData as any)?.error?.message ?? `Model ${model} unavailable (${response.status})`
        continue
      }

      if (!response.ok) {
        // Bad request or other client errors shouldn't be retried
        const errData = await response.json().catch(() => ({}))
        throw new Error((errData as any)?.error?.message ?? `AI request failed with status ${response.status}`)
      }

      const data = await response.json()
      const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        lastError = 'AI returned an empty response.'
        continue // Treat empty response like an error and try next model
      }
      
      return text
    }

    // If we've tried all models and haven't succeeded, but have retries left:
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }

  // If we get here, all models and retries failed due to being busy or unavailable.
  throw new Error('AI is currently experiencing high demand. Please wait a moment and try again.')
}

async function logUsage(userId: string, feature: 'ai_assist' | 'quick_create' | 'ask_ai' | 'test_ai', contentType?: string | null, instruction?: string | null) {
  try {
    const supabase = getServiceClient()
    await supabase.from('ai_usage_log').insert({
      user_id: userId,
      feature,
      content_type: contentType || null,
      instruction: instruction || null
    })
  } catch (err) {
    // Fire and forget - catch errors silently
  }
}

export async function getAiTrainingSettings(): Promise<AiTrainingSettings | null> {
  const supabase = getServiceClient()
  const { data } = await supabase.from('ai_training_settings').select('*').single()
  return data
}

export async function saveAiTrainingSettings(data: Omit<AiTrainingSettings, 'id' | 'updated_at' | 'updated_by'>): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin()
    
    const { data: existing } = await supabase.from('ai_training_settings').select('id').single()
    
    if (existing) {
      const { error } = await supabase.from('ai_training_settings').update({
        ...data,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase.from('ai_training_settings').insert({
        ...data,
        updated_by: user.id
      })
      
      if (error) throw error
    }
    
    revalidatePath('/admin/settings/ai-training')
    return { data: undefined }
  } catch (error: any) {
    return { error: error.message || 'Failed to save settings' }
  }
}

export async function aiAssistField(params: { contentType: AiContentType, fieldName: string, existingContext: string, instruction: string }): Promise<ActionResult<string>> {
  try {
    const { user } = await requireAdmin()
    const settings = await getAiTrainingSettings()
    
    if (!settings) {
      throw new Error('AI Training Settings not configured.')
    }
    
    const toolContext = await fetchToolKnowledge(params.existingContext + ' ' + params.instruction)
    const systemPrompt = buildSystemPrompt(settings, toolContext)
    
    const userPrompt = `Content type: ${params.contentType}
Field: ${params.fieldName}
Existing context (other fields already filled in): ${params.existingContext}
Instruction: ${params.instruction}

Generate the text for this specific field only. Keep it concise, on-brand, and matching our tone.`

    const text = await callGemini(systemPrompt, userPrompt, false)
    
    await logUsage(user.id, 'ai_assist', params.contentType, params.instruction)
    
    return { data: text }
  } catch (error: any) {
    return { error: error.message || 'AI assist failed' }
  }
}

export async function quickCreateRecord(params: { contentType: AiContentType, description: string }): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const { user } = await requireAdmin()
    const settings = await getAiTrainingSettings()
    
    if (!settings) {
      throw new Error('AI Training Settings not configured.')
    }
    
    const systemPrompt = buildSystemPrompt(settings)
    let userPrompt = ''
    
    if (params.contentType === 'tool') {
      userPrompt = `Create a complete sales tool entry for: ${params.description}
Return ONLY valid JSON with these exact fields:
{
  "name": string,
  "description": string (2-3 sentences),
  "category": one of ["AI Tools","Design Tools","Video Tools","Marketing Tools","Research Tools","Productivity","Sales","Automation"],
  "pricing": string (e.g. "Free", "$20/mo"),
  "best_for": string (1 sentence),
  "features": [string, string, string] (3-5 items),
  "tags": [string] (3-5 tags)
}`
    } else if (params.contentType === 'faq') {
      userPrompt = `Create a complete FAQ entry for: ${params.description}
Return ONLY valid JSON:
{
  "question": string (the customer's question),
  "short_answer": string (1-2 sentences, Hinglish),
  "detailed_answer": string (3-5 sentences, full explanation),
  "customer_ready_answer": string (polished WhatsApp-ready Hinglish response),
  "category": string (Category must be EXACTLY one of: Pricing, Product, Warranty, General, Technical, Comparison, Payment, Privacy, Delivery, Features, Policy, Usage, Support, Audience, Guideline),
  "tags": [string]
}`
    } else if (params.contentType === 'script') {
      userPrompt = `Create a complete sales script for: ${params.description}
Return ONLY valid JSON:
{
  "title": string,
  "script_type": one of ["greeting","whatsapp","voice_note_script","follow_up","closing","payment","objection_response","upsell","cross_sell","after_sales","review_request","warranty_explanation"],
  "content": string (the actual script text, WhatsApp Hinglish style),
  "when_to_use": string,
  "tags": [string]
}`
    } else if (params.contentType === 'objection') {
      userPrompt = `Create a complete objection handling entry for: ${params.description}
Return ONLY valid JSON:
{
  "objection_text": string (what the customer says),
  "meaning": string (what they really mean),
  "recommended_response": string (best response, Hinglish style),
  "alternative_response": string (backup response),
  "do_not_say": string (what NOT to say),
  "difficulty": one of ["beginner","intermediate","advanced"]
}`
    } else if (params.contentType === 'voice_note') {
      userPrompt = `Create a voice note outline for: ${params.description}
Return ONLY valid JSON:
{
  "title": string,
  "purpose": string,
  "when_to_send": string,
  "key_points": [string, string, string] (3-5 key talking points)
}`
    } else {
      throw new Error(`Unsupported content type: ${params.contentType}`)
    }
    
    const text = await callGemini(systemPrompt, userPrompt, true)
    
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      return { error: 'AI returned an invalid response. Please try again or rephrase your description.' }
    }
    
    await logUsage(user.id, 'quick_create', params.contentType, params.description)
    
    return { data: parsed }
  } catch (error: any) {
    return { error: error.message || 'Quick create failed' }
  }
}

export async function askAi(question: string): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Unauthorized')
    
    const settings = await getAiTrainingSettings()
    
    if (!settings) {
      throw new Error('AI Training Settings not configured.')
    }
    
    const toolContext = await fetchToolKnowledge(question)
    const systemPrompt = buildSystemPrompt(settings, toolContext)
    
    const userPrompt = `A salesman is asking for help with this customer situation:
${question}

Respond in EXACTLY this format with no other text before or after:
---SALESMAN INSTRUCTIONS---
[2-3 sentences coaching the salesman on how to approach this. Plain text only, no asterisks, no bold.]
---CLIENT MESSAGE---
[The actual WhatsApp message to send to the customer. Plain Hinglish text only. No asterisks, no markdown, no meta-commentary, no [placeholder] text.]`

    const text = await callGemini(systemPrompt, userPrompt, false)
    
    await logUsage(user.id, 'ask_ai', null, question)
    
    return { data: text }
  } catch (error: any) {
    return { error: error.message || 'Failed to get AI suggestion' }
  }
}

export async function testAiSettings(question: string): Promise<ActionResult<string>> {
  try {
    const { user } = await requireAdmin()
    
    const settings = await getAiTrainingSettings()
    
    if (!settings) {
      throw new Error('AI Training Settings not configured.')
    }
    
    const systemPrompt = buildSystemPrompt(settings)
    
    const userPrompt = `A salesman is asking for help with this customer situation:
${question}

Provide a suggested WhatsApp reply they can send to the customer. Be concise, warm, and match our Hinglish tone. Format as a message they can copy and paste directly.`

    const text = await callGemini(systemPrompt, userPrompt, false)
    
    await logUsage(user.id, 'test_ai', null, question)
    
    return { data: text }
  } catch (error: any) {
    return { error: error.message || 'Test failed' }
  }
}
