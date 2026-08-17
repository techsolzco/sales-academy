'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type {
  ActionResult,
  OnboardWizardData,
  GeneratedToolPackage,
  ToolTreeData,
} from '@/types'
import { getAiTrainingSettings } from './ai-assist'

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

// ── Gemini call (higher token limit for package generation) ──────────────

const GEMINI_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
]

async function callGeminiLarge(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server.')

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }], role: 'user' }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  for (let attempt = 0; attempt <= 2; attempt++) {
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (response.status === 429 || response.status === 503 || response.status === 500) continue
      if (response.status === 404 || response.status === 403) continue
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error((errData as Record<string, unknown>)?.error
          ? String((errData as Record<string, Record<string, string>>).error.message)
          : `AI request failed with status ${response.status}`)
      }

      const data = await response.json()
      const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) continue
      return text
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error('AI is currently experiencing high demand. Please wait and try again.')
}

// ── Generate full tool package ──────────────────────────────────────────

export async function generateToolPackage(
  wizardData: OnboardWizardData
): Promise<ActionResult<GeneratedToolPackage>> {
  try {
    await requireAdmin()
    const settings = await getAiTrainingSettings()

    const systemPrompt = settings
      ? `[PERSONA]\n${settings.persona_instructions}\n\n[SALES STYLE RULES]\n${settings.sales_style_rules}\n\nIMPORTANT: Write all generated content in Hinglish — a natural mix of English and Roman Urdu. Do not use pure Urdu script or pure formal English.\n\n[LOCKED FACTS]\n${settings.locked_facts}\n\n[TONE EXAMPLES]\n${settings.tone_examples}`
      : 'You are a sales training content creator. Write in Hinglish style.'

    const featuresStr = wizardData.features?.length ? `Key features: ${wizardData.features.join(', ')}` : ''
    const pricingStr = wizardData.pricing ? `Pricing: ${wizardData.pricing}` : ''
    const audienceStr = wizardData.targetAudience ? `Target audience: ${wizardData.targetAudience}` : ''
    const sellingStr = wizardData.sellingPoints ? `Main selling points: ${wizardData.sellingPoints}` : ''
    const warrantyStr = wizardData.warrantyNotes ? `Warranty/policy notes: ${wizardData.warrantyNotes}` : ''
    const categoryStr = wizardData.category ? `Category: ${wizardData.category}` : ''

    const userPrompt = `Generate a COMPLETE training package for the sales tool "${wizardData.name}".

Tool info:
${categoryStr}
${pricingStr}
${featuresStr}
${audienceStr}
${sellingStr}
${warrantyStr}

Admin's brief: ${wizardData.brief}

Return ONLY valid JSON with this exact structure:
{
  "knowledge_summary": "A concise 3-5 sentence internal knowledge paragraph covering key facts about this tool (pricing, policies, features, warranty). This is for AI context, NOT customer-facing.",
  "course": {
    "title": "How to Sell [Tool Name] — Complete Training",
    "description": "Course overview (2-3 sentences)",
    "modules": [
      {
        "title": "Module title",
        "description": "Module description",
        "lessons": [
          {
            "title": "Lesson title",
            "description": "Lesson description",
            "content_blocks": [
              { "type": "heading", "content": { "text": "Section Heading", "level": 2 }, "order_index": 1 },
              { "type": "text", "content": { "body": "Detailed lesson content paragraph..." }, "order_index": 2 }
            ]
          }
        ]
      }
    ]
  },
  "faqs": [
    {
      "question": "Customer question in Hinglish",
      "short_answer": "1-2 sentence answer",
      "detailed_answer": "3-5 sentence detailed explanation",
      "customer_ready_answer": "WhatsApp-ready Hinglish response",
      "category": "Category name",
      "tags": ["tag1", "tag2"]
    }
  ],
  "objections": [
    {
      "objection_text": "What the customer says",
      "meaning": "What they really mean",
      "recommended_response": "Best Hinglish response",
      "alternative_response": "Backup response",
      "do_not_say": "What NOT to say",
      "difficulty": "beginner|intermediate|advanced"
    }
  ],
  "scripts": [
    {
      "title": "Script title",
      "script_type": "greeting|closing|follow_up|objection_response",
      "content": "Full WhatsApp-ready script text in Hinglish",
      "when_to_use": "When to send this",
      "tags": ["tag1"]
    }
  ]
}

Requirements:
- Course: 2-3 modules, each with 1-2 lessons, each lesson with 3-5 content blocks (mix of heading + text)
- FAQs: Generate exactly 15-20 FAQs
- Objections: Generate exactly 5-8 objections
- Scripts: Generate exactly 3-4 scripts (include greeting, closing, follow_up, objection_response types)
- All content in Hinglish (mix of English and Roman Urdu)
- Make content practical, specific to this tool, and WhatsApp-friendly`

    const text = await callGeminiLarge(systemPrompt, userPrompt)

    let parsed: GeneratedToolPackage
    try {
      parsed = JSON.parse(text)
    } catch {
      return { error: 'AI returned an invalid response. Please try again.' }
    }

    // Basic validation
    if (!parsed.knowledge_summary || !parsed.course || !parsed.faqs || !parsed.objections || !parsed.scripts) {
      return { error: 'AI response is missing required sections. Please try again.' }
    }

    return { data: parsed }
  } catch (error: unknown) {
    return { error: (error as Error).message || 'Failed to generate tool package' }
  }
}

// ── Save full tool package to database ──────────────────────────────────

export async function saveToolPackage(
  wizardData: OnboardWizardData,
  packageData: GeneratedToolPackage,
  publishNow: boolean
): Promise<ActionResult<{ toolId: string }>> {
  try {
    const { user } = await requireAdmin()
    const sb = getServiceClient()
    const status = publishNow ? 'published' : 'draft'

    // 1. Create or update the tool
    const { data: tool, error: toolErr } = await sb
      .from('tools')
      .insert({
        name: wizardData.name,
        description: wizardData.brief,
        category: wizardData.category || 'Sales',
        pricing: wizardData.pricing || null,
        best_for: wizardData.targetAudience || null,
        features: wizardData.features || [],
        knowledge_summary: packageData.knowledge_summary,
        status,
        tags: [],
      })
      .select('id')
      .single()
    if (toolErr) throw toolErr
    const toolId = tool.id

    // 2. Create the course
    const { data: course, error: courseErr } = await sb
      .from('courses')
      .insert({
        title: packageData.course.title,
        description: packageData.course.description,
        status,
        tool_id: toolId,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (courseErr) throw courseErr

    // 3. Create modules, lessons, content blocks
    for (let mi = 0; mi < packageData.course.modules.length; mi++) {
      const mod = packageData.course.modules[mi]
      if ((mod as unknown as Record<string, boolean>)._removed) continue

      const { data: dbMod, error: modErr } = await sb
        .from('modules')
        .insert({
          course_id: course.id,
          title: mod.title,
          description: mod.description,
          order_index: mi + 1,
          status,
        })
        .select('id')
        .single()
      if (modErr) throw modErr

      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li]
        if ((lesson as unknown as Record<string, boolean>)._removed) continue

        const { data: dbLesson, error: lesErr } = await sb
          .from('lessons')
          .insert({
            module_id: dbMod.id,
            title: lesson.title,
            description: lesson.description,
            order_index: li + 1,
            status,
          })
          .select('id')
          .single()
        if (lesErr) throw lesErr

        // Insert content blocks
        const blocks = lesson.content_blocks.map((b, bi) => ({
          lesson_id: dbLesson.id,
          type: b.type,
          content: b.content,
          order_index: bi + 1,
        }))
        if (blocks.length > 0) {
          const { error: blockErr } = await sb.from('content_blocks').insert(blocks)
          if (blockErr) throw blockErr
        }
      }
    }

    // 4. Create FAQs
    const faqInserts = packageData.faqs
      .filter(f => !(f as unknown as Record<string, boolean>)._removed)
      .map(f => ({
        question: f.question,
        short_answer: f.short_answer,
        detailed_answer: f.detailed_answer,
        customer_ready_answer: f.customer_ready_answer,
        category: f.category,
        tags: f.tags || [],
        tool_id: toolId,
        status,
      }))
    if (faqInserts.length > 0) {
      const { error: faqErr } = await sb.from('faqs').insert(faqInserts)
      if (faqErr) throw faqErr
    }

    // 5. Create Objections
    const objInserts = packageData.objections
      .filter(o => !(o as unknown as Record<string, boolean>)._removed)
      .map(o => ({
        objection_text: o.objection_text,
        meaning: o.meaning,
        recommended_response: o.recommended_response,
        alternative_response: o.alternative_response,
        do_not_say: o.do_not_say,
        difficulty: o.difficulty,
        tool_id: toolId,
        status,
      }))
    if (objInserts.length > 0) {
      const { error: objErr } = await sb.from('objections').insert(objInserts)
      if (objErr) throw objErr
    }

    // 6. Create Scripts
    const scriptInserts = packageData.scripts
      .filter(s => !(s as unknown as Record<string, boolean>)._removed)
      .map(s => ({
        title: s.title,
        script_type: s.script_type,
        content: s.content,
        when_to_use: s.when_to_use,
        tags: s.tags || [],
        language: 'Hinglish',
        tool_id: toolId,
        status,
      }))
    if (scriptInserts.length > 0) {
      const { error: scriptErr } = await sb.from('scripts').insert(scriptInserts)
      if (scriptErr) throw scriptErr
    }

    revalidatePath('/admin/tools')
    revalidatePath('/dashboard/tools')
    revalidatePath('/admin/faqs')
    revalidatePath('/admin/scripts')
    revalidatePath('/admin/objections')

    return { data: { toolId } }
  } catch (error: unknown) {
    return { error: (error as Error).message || 'Failed to save tool package' }
  }
}

// ── Fetch tool tree (all linked content) ────────────────────────────────

export async function fetchToolTree(toolId: string): Promise<ActionResult<ToolTreeData>> {
  try {
    await requireAdmin()
    const sb = getServiceClient()

    const { data: tool, error: toolErr } = await sb
      .from('tools')
      .select('*')
      .eq('id', toolId)
      .single()
    if (toolErr || !tool) return { error: 'Tool not found' }

    // Course with nested modules > lessons > content blocks
    const { data: courses } = await sb
      .from('courses')
      .select('*')
      .eq('tool_id', toolId)
      .limit(1)

    let courseWithModules = null
    if (courses && courses.length > 0) {
      const course = courses[0]
      const { data: modules } = await sb
        .from('modules')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index')

      const modulesWithLessons = []
      for (const mod of (modules || [])) {
        const { data: lessons } = await sb
          .from('lessons')
          .select('*')
          .eq('module_id', mod.id)
          .order('order_index')

        const lessonsWithBlocks = []
        for (const lesson of (lessons || [])) {
          const { data: blocks } = await sb
            .from('content_blocks')
            .select('*')
            .eq('lesson_id', lesson.id)
            .order('order_index')
          lessonsWithBlocks.push({ ...lesson, content_blocks: blocks || [] })
        }
        modulesWithLessons.push({ ...mod, lessons: lessonsWithBlocks })
      }
      courseWithModules = { ...course, modules: modulesWithLessons }
    }

    const { data: faqs } = await sb.from('faqs').select('*').eq('tool_id', toolId).order('created_at')
    const { data: objections } = await sb.from('objections').select('*').eq('tool_id', toolId).order('created_at')
    const { data: scripts } = await sb.from('scripts').select('*').eq('tool_id', toolId).order('created_at')

    return {
      data: {
        tool,
        course: courseWithModules,
        faqs: faqs || [],
        objections: objections || [],
        scripts: scripts || [],
      }
    }
  } catch (error: unknown) {
    return { error: (error as Error).message || 'Failed to fetch tool tree' }
  }
}
