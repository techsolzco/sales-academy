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

function buildSystemPrompt(settings: AiTrainingSettings) {
  return `[PERSONA]
${settings.persona_instructions}

[SALES STYLE RULES]
${settings.sales_style_rules}

[LOCKED FACTS — NEVER CONTRADICT OR INVENT BEYOND THESE]
${settings.locked_facts}

[TONE & STYLE EXAMPLES]
${settings.tone_examples}`
}

async function callGemini(systemPrompt: string, userPrompt: string, jsonMode: boolean = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }], role: "user" }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    })
  })

  if (response.status === 429) {
    throw new Error('AI is busy right now — please try again in a moment.')
  }

  if (!response.ok) {
    throw new Error(`AI Request failed with status ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  
  if (!text) {
    throw new Error('AI returned an empty response')
  }

  return text
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
  const supabase = await createClient()
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
    
    const systemPrompt = buildSystemPrompt(settings)
    
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
  "category": string,
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
    
    const systemPrompt = buildSystemPrompt(settings)
    
    const userPrompt = `A salesman is asking for help with this customer situation:
${question}

Provide a suggested WhatsApp reply they can send to the customer. Be concise, warm, and match our Hinglish tone. Format as a message they can copy and paste directly.`

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
