'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest']

async function callGeminiForQuiz(userPrompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!
  const body = JSON.stringify({
    contents: [{ parts: [{ text: userPrompt }], role: 'user' }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 4096, responseMimeType: 'application/json' },
  })
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    if (!res.ok) continue
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) return text
  }
  throw new Error('AI unavailable for quiz generation')
}

export async function generateAndSaveToolQuiz(
  toolId: string,
  toolName: string,
  userId: string,
  faqs: Array<{ question: string; short_answer: string }>,
  objections: Array<{ objection_text: string; recommended_response: string }>,
  scripts: Array<{ title: string; script_type: string }>
): Promise<void> {
  const sb = getServiceClient()

  const context = [
    'FAQs:',
    ...faqs.slice(0, 8).map(f => `Q: ${f.question} — A: ${f.short_answer}`),
    '\nObjections:',
    ...objections.slice(0, 5).map(o => `Objection: ${o.objection_text} — Response: ${o.recommended_response}`),
    '\nScript types available:',
    scripts.map(s => s.script_type).join(', '),
  ].join('\n')

  const prompt = `Based on this sales training content for "${toolName}", generate a quiz with exactly 8 multiple-choice questions.

${context}

Return ONLY valid JSON:
{
  "title": "${toolName} — Knowledge Check Quiz",
  "description": "Test your knowledge of ${toolName} sales materials",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0
    }
  ]
}

Make questions practical and test real sales knowledge. Mix easy and hard questions.`

  try {
    const text = await callGeminiForQuiz(prompt)
    const parsed = JSON.parse(text)
    if (!parsed.questions?.length) return

    // Check if quiz already exists for this tool
    const { data: existingQuiz } = await sb.from('quizzes').select('id').eq('tool_id', toolId).maybeSingle()
    
    let quizId: string
    if (existingQuiz) {
      quizId = existingQuiz.id
      // Delete existing questions to regenerate
      await sb.from('quiz_questions').delete().eq('quiz_id', quizId)
    } else {
      const { data: quiz, error: quizErr } = await sb.from('quizzes').insert({
        title: parsed.title,
        description: parsed.description,
        tool_id: toolId,
        created_by: userId,
        status: 'published',
        passing_score: 70,
      }).select('id').single()
      if (quizErr || !quiz) return
      quizId = quiz.id
    }

    // Insert questions and options
    for (let qi = 0; qi < parsed.questions.length; qi++) {
      const q = parsed.questions[qi]
      const { data: dbQ, error: qErr } = await sb.from('quiz_questions').insert({
        quiz_id: quizId,
        question_text: q.question,
        order_index: qi + 1,
      }).select('id').single()
      if (qErr || !dbQ) continue

      const options = (q.options as string[]).map((opt: string, oi: number) => ({
        question_id: dbQ.id,
        option_text: opt,
        is_correct: oi === q.correct_index,
        order_index: oi + 1,
      }))
      await sb.from('quiz_options').insert(options)
    }
  } catch (e) {
    console.error('Quiz auto-generation failed (non-fatal):', e)
  }
}
