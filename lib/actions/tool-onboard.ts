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
import { generateAndSaveToolQuiz } from './tool-quiz'

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

async function callGeminiLarge(systemPrompt: string, userPrompt: string, maxTokens = 6144): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server.')

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }], role: 'user' }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  })

  for (let attempt = 0; attempt <= 2; attempt++) {
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      // 25-second per-request timeout so slow models don't block the whole generation
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)
      let response: Response
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        })
      } catch (fetchErr: any) {
        clearTimeout(timeoutId)
        if (fetchErr.name === 'AbortError') {
          console.warn(`[ToolOnboard] ${model} timed out after 25s, trying next model`)
          continue
        }
        throw fetchErr
      }
      clearTimeout(timeoutId)

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
    if (attempt < 2) await new Promise(r => setTimeout(r, 1500))
  }
  throw new Error('AI is currently experiencing high demand. Please wait and try again.')
}


// ── Helper: strip markdown code fences from Gemini output ─────────────
function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers Gemini sometimes adds
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

// ── Safe JSON parse with logging ──────────────────────────────────────
function safeJsonParse<T>(text: string, label: string): T | null {
  const cleaned = stripMarkdownFences(text)
  try {
    return JSON.parse(cleaned) as T
  } catch (e) {
    console.error(`[ToolOnboard] JSON parse failed for "${label}":`, e)
    console.error(`[ToolOnboard] Raw text (first 800 chars):`, cleaned.slice(0, 800))
    return null
  }
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

    const toolContext = `Tool: "${wizardData.name}"
${categoryStr}
${pricingStr}
${featuresStr}
${audienceStr}
${sellingStr}
${warrantyStr}
Admin's brief: ${wizardData.brief}`

    // ── CALL 1: Course structure + knowledge summary ──────────────────────
    const call1Prompt = `${toolContext}

Generate ONLY the course training structure and knowledge summary for this sales tool.
Return ONLY valid JSON (no markdown, no explanation):
{
  "knowledge_summary": "3-5 sentence internal knowledge paragraph covering pricing, features, warranty. For AI context, NOT customer-facing.",
  "course": {
    "title": "How to Sell ${wizardData.name} — Complete Training",
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
              { "type": "text", "content": { "body": "Detailed lesson content paragraph (3-4 sentences)." }, "order_index": 2 }
            ]
          }
        ]
      }
    ]
  }
}
Requirements: 2 modules, each with 1-2 lessons, each lesson with 3-4 content blocks (mix of heading + text).`

    // ── CALL 2: FAQs + Objections + Scripts (KB content) ─────────────────
    const call2Prompt = `${toolContext}

Generate ONLY the knowledge base content (FAQs, objections, scripts) for this sales tool.
Return ONLY valid JSON (no markdown, no explanation):
{
  "faqs": [
    {
      "question": "Customer question in English",
      "question_hinglish": "Same question in Hinglish",
      "short_answer": "Short answer in English (1-2 sentences)",
      "short_answer_hinglish": "Same in Hinglish",
      "detailed_answer": "Detailed answer (3-4 sentences)",
      "customer_ready_answer": "WhatsApp-ready English response",
      "customer_ready_answer_hinglish": "WhatsApp-ready Hinglish response",
      "category": "Pricing|Product|Warranty|General|Technical|Comparison|Payment|Privacy|Delivery|Features|Policy|Usage|Support|Audience|Guideline",
      "tags": ["tag1"]
    }
  ],
  "objections": [
    {
      "objection_text": "What the customer says",
      "meaning": "What they really mean",
      "recommended_response": "Best English response",
      "recommended_response_hinglish": "Same in Hinglish",
      "alternative_response": "Backup response",
      "do_not_say": "What NOT to say",
      "difficulty": "beginner|intermediate|advanced"
    }
  ],
  "scripts": [
    {
      "title": "Script title",
      "script_type": "greeting|whatsapp|voice_note_script|follow_up|closing|payment|objection_response|upsell|cross_sell|after_sales|review_request",
      "content": "Full script text in English",
      "content_hinglish": "Same script in Hinglish",
      "when_to_use": "When to send this",
      "tags": ["tag1"]
    }
  ]
}
Requirements:
- FAQs: exactly 12 FAQs, try to cover a mix of these categories: Pricing, Product, Warranty, General, Technical, Comparison, Payment, Privacy, Delivery, Features, Policy, Usage, Support, Audience, Guideline
- Objections: exactly 8 objections — 3 beginner, 3 intermediate, 2 advanced
- Scripts: exactly 8 scripts covering these types (one each): greeting, whatsapp, follow_up, closing, payment, objection_response, upsell, after_sales
- IMPORTANT LANGUAGE RULE: Ensure strict language consistency within an item. For any Hinglish field (e.g. question_hinglish, short_answer_hinglish, recommended_response_hinglish), it MUST be in Hinglish, and it MUST correspond directly to its English counterpart. Do not provide a Hinglish answer to an English question or vice versa. Both must be provided and must match in language style.
- All Hinglish content must be Roman script (no Urdu script)
- Make content specific to "${wizardData.name}" and WhatsApp-ready`

    const call3Prompt = `You are a sales training content creator. Generate exactly 3 voice-note-style audio scripts for the sales tool: "${wizardData.name}".

Tool context:
- Pricing: ${wizardData.pricing || 'not specified'}
- Key Features: ${(wizardData.features || []).join(', ')}
- Brief: ${wizardData.brief}

For each voice note, provide:
- title: Short descriptive title (e.g. "Introduction to [Tool]", "How to Handle Price Objection")
- transcript: A natural, conversational voice note script in Hinglish (Roman Urdu + English mix), 3-5 sentences, as if speaking to a salesman. Should feel like a voice message from a trainer.
- purpose: One-line description of when to use this voice note
- when_to_send: Specific trigger scenario (e.g. "Before first client call", "After quiz completion")
- language: always "Hinglish"

Return ONLY valid JSON (no markdown fences, no explanation) in exactly this format:
{
  "voice_notes": [
    {
      "title": "string",
      "transcript": "string",
      "purpose": "string",
      "when_to_send": "string",
      "language": "Hinglish"
    }
  ]
}`

    console.log('[ToolOnboard] Starting 3-call generation for:', wizardData.name)

    // Run calls in parallel — token limits tuned to reduce latency on hosted environments
    const [call1Text, call2Text, call3Text] = await Promise.all([
      callGeminiLarge(systemPrompt, call1Prompt, 4096),   // course structure + summary
      callGeminiLarge(systemPrompt, call2Prompt, 6144),   // FAQs + objections + scripts (largest)
      callGeminiLarge(systemPrompt, call3Prompt, 2048),   // voice notes (small)
    ])

    console.log('[ToolOnboard] Call 1 raw (first 200):', call1Text.slice(0, 200))
    console.log('[ToolOnboard] Call 2 raw (first 200):', call2Text.slice(0, 200))
    console.log('[ToolOnboard] Call 3 raw (first 200):', call3Text.slice(0, 200))

    type Call1Result = { knowledge_summary: string; course: GeneratedToolPackage['course'] }
    type Call2Result = { faqs: GeneratedToolPackage['faqs']; objections: GeneratedToolPackage['objections']; scripts: GeneratedToolPackage['scripts'] }
    type Call3Result = { voice_notes: GeneratedToolPackage['voice_notes'] }

    const part1 = safeJsonParse<Call1Result>(call1Text, 'course+summary')
    const part2 = safeJsonParse<Call2Result>(call2Text, 'kb-content')
    const part3 = safeJsonParse<Call3Result>(call3Text, 'voice-notes')

    // Retry failed parts with simpler prompts
    let finalPart1 = part1
    let finalPart2 = part2
    let finalPart3 = part3

    if (!finalPart1) {
      console.log('[ToolOnboard] Call 1 failed, retrying with stricter prompt...')
      const retryText = await callGeminiLarge(
        'You are a JSON generator. Return ONLY valid JSON, no markdown, no explanation.',
        call1Prompt
      )
      finalPart1 = safeJsonParse<Call1Result>(retryText, 'course+summary retry')
    }

    if (!finalPart2) {
      console.log('[ToolOnboard] Call 2 failed, retrying with stricter prompt...')
      const retryText = await callGeminiLarge(
        'You are a JSON generator. Return ONLY valid JSON, no markdown, no explanation.',
        call2Prompt
      )
      finalPart2 = safeJsonParse<Call2Result>(retryText, 'kb-content retry')
    }

    if (!finalPart3) {
      console.log('[ToolOnboard] Call 3 failed, retrying with stricter prompt...')
      const retryText = await callGeminiLarge(
        'You are a JSON generator. Return ONLY valid JSON, no markdown, no explanation.',
        call3Prompt
      )
      finalPart3 = safeJsonParse<Call3Result>(retryText, 'voice-notes retry')
    }

    if (!finalPart1 || !finalPart1.knowledge_summary || !finalPart1.course) {
      return { error: 'AI could not generate the course structure. Please try again in a moment.' }
    }
    if (!finalPart2 || !finalPart2.faqs || !finalPart2.objections || !finalPart2.scripts) {
      return { error: 'AI could not generate the knowledge base content. Please try again in a moment.' }
    }
    if (!finalPart3 || !finalPart3.voice_notes) {
      return { error: 'AI could not generate the voice notes. Please try again in a moment.' }
    }

    const parsed: GeneratedToolPackage = {
      knowledge_summary: finalPart1.knowledge_summary,
      course: finalPart1.course,
      faqs: finalPart2.faqs,
      objections: finalPart2.objections,
      scripts: finalPart2.scripts,
      voice_notes: finalPart3.voice_notes,
    }

    console.log('[ToolOnboard] Success — FAQs:', parsed.faqs.length, '| Objections:', parsed.objections.length, '| Scripts:', parsed.scripts.length, '| Voice Notes:', parsed.voice_notes.length)

    return { data: parsed }
  } catch (error: unknown) {
    console.error('[ToolOnboard] generateToolPackage error:', error)
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
        question_hinglish: (f as any).question_hinglish || null,
        short_answer: f.short_answer,
        short_answer_hinglish: (f as any).short_answer_hinglish || null,
        detailed_answer: f.detailed_answer,
        customer_ready_answer: f.customer_ready_answer,
        customer_ready_answer_hinglish: (f as any).customer_ready_answer_hinglish || null,
        category: f.category,
        tags: f.tags || [],
        tool_id: toolId,
        course_id: course.id,
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
        recommended_response_hinglish: (o as any).recommended_response_hinglish || null,
        alternative_response: o.alternative_response,
        do_not_say: o.do_not_say,
        difficulty: o.difficulty,
        tool_id: toolId,
        course_id: course.id,
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
        content_hinglish: (s as any).content_hinglish || null,
        when_to_use: s.when_to_use,
        tags: s.tags || [],
        language: 'Hinglish',
        tool_id: toolId,
        course_id: course.id,
        status,
      }))
    if (scriptInserts.length > 0) {
      const { error: scriptErr } = await sb.from('scripts').insert(scriptInserts)
      if (scriptErr) throw scriptErr
    }

    // 7. Create Voice Notes
    const voiceNoteInserts = packageData.voice_notes
      .filter(v => !(v as unknown as Record<string, boolean>)._removed)
      .map(v => ({
        title: v.title,
        transcript: v.transcript,
        purpose: v.purpose,
        when_to_send: v.when_to_send,
        language: v.language || 'Hinglish',
        tool_id: toolId,
        status,
        audio_url: '', // required by schema but not generated by AI yet
      }))
    if (voiceNoteInserts.length > 0) {
      const { error: vnErr } = await sb.from('voice_notes').insert(voiceNoteInserts)
      if (vnErr) throw vnErr
    }

    revalidatePath('/admin/tools')
    revalidatePath('/dashboard/tools')
    revalidatePath('/admin/faqs')
    revalidatePath('/admin/scripts')
    revalidatePath('/admin/objections')

    // 7. Auto-create/update assignment for this tool
    try {
      const assignmentTitle = `${wizardData.name} — Product Training Assignment`
      const assignmentInstructions = `You have been assigned the ${wizardData.name} product training. To complete this assignment:

📚 STEP 1 — Review the Knowledge Base
• Study all ${faqInserts.length} FAQs about ${wizardData.name}
• Learn to handle ${objInserts.length} common customer objections
• Practice the ${scriptInserts.length} sales scripts (WhatsApp, greeting, follow-up, closing, etc.)
• Listen to the training voice notes

🎯 STEP 2 — Understand the Product
${wizardData.brief || `Learn everything about ${wizardData.name} so you can pitch it confidently.`}
${wizardData.pricing ? `💰 Pricing: ${wizardData.pricing}` : ''}
${wizardData.targetAudience ? `👥 Target customer: ${wizardData.targetAudience}` : ''}

✅ STEP 3 — Take the Quiz
Complete the auto-generated quiz to demonstrate your knowledge. You need to pass to complete this assignment.

📤 STEP 4 — Submit
Once you complete all steps and pass the quiz, mark this assignment as done.`
      
      const { data: existingAssignment } = await sb.from('assignments').select('id').is('deleted_at', null).eq('tool_id', toolId).maybeSingle()
      if (existingAssignment) {
        await sb.from('assignments').update({
          title: assignmentTitle,
          instructions: assignmentInstructions,
        }).eq('id', existingAssignment.id)
      } else {
        await sb.from('assignments').insert({
          title: assignmentTitle,
          instructions: assignmentInstructions,
          tool_id: toolId,
          created_by: user.id,
        })
      }
    } catch (e) {
      console.error('Auto-assignment creation failed (non-fatal):', e)
    }

    revalidatePath('/admin/assignments')

    try {
      await generateAndSaveToolQuiz(
        toolId,
        wizardData.name,
        user.id,
        faqInserts.map(f => ({ question: f.question, short_answer: f.short_answer })),
        objInserts.map(o => ({ objection_text: o.objection_text, recommended_response: o.recommended_response })),
        scriptInserts.map(s => ({ title: s.title, script_type: s.script_type }))
      )
      revalidatePath('/admin/quizzes')
    } catch(e) {
      console.error('Non-fatal quiz gen error:', e)
    }

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
      .select('*').is('deleted_at', null)
      .eq('id', toolId)
      .single()
    if (toolErr || !tool) return { error: 'Tool not found' }

    // Course with nested modules > lessons > content blocks
    const { data: courses } = await sb
      .from('courses')
      .select('*').is('deleted_at', null)
      .eq('tool_id', toolId)
      .limit(1)

    let courseWithModules = null
    if (courses && courses.length > 0) {
      const course = courses[0]
      const { data: modules } = await sb
        .from('modules')
        .select('*').is('deleted_at', null)
        .eq('course_id', course.id)
        .order('order_index')

      const modulesWithLessons = []
      for (const mod of (modules || [])) {
        const { data: lessons } = await sb
          .from('lessons')
          .select('*').is('deleted_at', null)
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

    const { data: faqs } = await sb.from('faqs').select('*').is('deleted_at', null).eq('tool_id', toolId).order('created_at')
    const { data: objections } = await sb.from('objections').select('*').is('deleted_at', null).eq('tool_id', toolId).order('created_at')
    const { data: scripts } = await sb.from('scripts').select('*').is('deleted_at', null).eq('tool_id', toolId).order('created_at')

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

// ── Publish tool tree (all or by section) ────────────────────────────

export async function publishToolTree(
  toolId: string,
  section?: 'all' | 'course' | 'faqs' | 'objections' | 'scripts'
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const sb = getServiceClient()
    const target = section || 'all'

    if (target === 'all' || target === 'course') {
      // Find course linked to tool
      const { data: courses } = await sb.from('courses').select('id').is('deleted_at', null).eq('tool_id', toolId)
      for (const course of (courses || [])) {
        await sb.from('courses').update({ status: 'published' }).eq('id', course.id)
        // Modules
        const { data: modules } = await sb.from('modules').select('id').is('deleted_at', null).eq('course_id', course.id)
        for (const mod of (modules || [])) {
          await sb.from('modules').update({ status: 'published' }).eq('id', mod.id)
          // Lessons
          const { data: lessons } = await sb.from('lessons').select('id').is('deleted_at', null).eq('module_id', mod.id)
          for (const lesson of (lessons || [])) {
            await sb.from('lessons').update({ status: 'published' }).eq('id', lesson.id)
          }
        }
      }
    }

    if (target === 'all' || target === 'faqs') {
      await sb.from('faqs').update({ status: 'published' }).eq('tool_id', toolId)
    }

    if (target === 'all' || target === 'objections') {
      await sb.from('objections').update({ status: 'published' }).eq('tool_id', toolId)
    }

    if (target === 'all' || target === 'scripts') {
      await sb.from('scripts').update({ status: 'published' }).eq('tool_id', toolId)
    }

    // Also publish the tool itself
    if (target === 'all') {
      await sb.from('tools').update({ status: 'published' }).eq('id', toolId)
    }

    revalidatePath(`/admin/tools/${toolId}/tree`)
    revalidatePath('/admin/tools')
    revalidatePath('/dashboard/tools')
    revalidatePath('/admin/faqs')
    revalidatePath('/admin/scripts')
    revalidatePath('/admin/objections')
    revalidatePath('/admin/courses')

    return { data: undefined }
  } catch (error: unknown) {
    return { error: (error as Error).message || 'Failed to publish' }
  }
}

export async function refreshToolKnowledge(toolId: string): Promise<ActionResult<string>> {
  try {
    await requireAdmin()
    const sb = getServiceClient()

    const { data: tool } = await sb.from('tools').select('*').is('deleted_at', null).eq('id', toolId).single()
    if (!tool) return { error: 'Tool not found' }

    const settings = await getAiTrainingSettings()
    const systemPrompt = settings
      ? `You are a sales training AI. Write all content in Hinglish style.`
      : 'You are a sales training AI.'

    const featuresStr = tool.features?.length ? `Features: ${tool.features.join(', ')}` : ''
    const userPrompt = `Generate a concise 3-5 sentence knowledge summary for the sales tool "${tool.name}".
${tool.description ? `Description: ${tool.description}` : ''}
${tool.pricing ? `Pricing: ${tool.pricing}` : ''}
${tool.best_for ? `Best for: ${tool.best_for}` : ''}
${featuresStr}

This summary is for internal AI context only — not customer-facing. Cover key facts about this tool that a salesman would need to know (pricing, policies, features, what it does). Write in Hinglish style. Return ONLY the summary text, no JSON.`

    const text = await callGeminiLarge(systemPrompt, userPrompt)

    const { error: updateErr } = await sb
      .from('tools')
      .update({ knowledge_summary: text, updated_at: new Date().toISOString() })
      .eq('id', toolId)

    if (updateErr) throw updateErr

    revalidatePath(`/admin/tools/${toolId}/tree`)
    revalidatePath('/admin/tools')

    return { data: text }
  } catch (error: unknown) {
    return { error: (error as Error).message || 'Failed to refresh knowledge' }
  }
}
