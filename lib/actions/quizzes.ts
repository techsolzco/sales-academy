'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}
import { ActionResult, Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAttemptAnswer, QuizAttemptResult } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createQuiz(input: { title: string, description?: string, lesson_id?: string | null, tool_id?: string | null, pass_score?: number }): Promise<ActionResult<Quiz>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('quizzes')
    .insert([{ ...input, created_by: user.id }])
    .select()
    .single()

  if (error || !data) return { error: error?.message || 'Failed to create quiz' }
  revalidatePath('/admin/quizzes')
  return { data }
}

export async function updateQuiz(id: string, input: Partial<{ title: string; description: string; lesson_id: string | null; tool_id: string | null; pass_score: number }>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('quizzes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/admin/quizzes/${id}`)
  revalidatePath('/admin/quizzes')
  return { data: undefined }
}

export async function addQuestion(quizId: string, input: { question_text: string, points?: number, order_index?: number }): Promise<ActionResult<QuizQuestion>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert([{ quiz_id: quizId, ...input }])
    .select()
    .single()

  if (error || !data) return { error: error?.message || 'Failed to add question' }
  revalidatePath(`/admin/quizzes/${quizId}`)
  return { data }
}

export async function addOption(questionId: string, input: { option_text: string, is_correct: boolean, order_index?: number }): Promise<ActionResult<QuizOption>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('quiz_options')
    .insert([{ question_id: questionId, ...input }])
    .select()
    .single()

  if (error || !data) return { error: error?.message || 'Failed to add option' }
  return { data }
}

export async function updateQuestion(id: string, input: Partial<QuizQuestion>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('quiz_questions').update(input).eq('id', id)
  if (error) return { error: error.message }
  return { data: undefined }
}

export async function updateOption(id: string, input: Partial<QuizOption>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('quiz_options').update(input).eq('id', id)
  if (error) return { error: error.message }
  return { data: undefined }
}

export async function deleteQuestion(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('quiz_questions').delete().eq('id', id)
  if (error) return { error: error.message }
  return { data: undefined }
}

export async function deleteOption(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('quiz_options').delete().eq('id', id)
  if (error) return { error: error.message }
  return { data: undefined }
}

export async function fetchQuiz(id: string): Promise<(Quiz & { questions: (QuizQuestion & { options: QuizOption[] })[]; attemptCount?: number; maxAttempts?: number }) | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      questions:quiz_questions(
        *,
        options:quiz_options(id, question_id, option_text, order_index)
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  // Sort questions and options
  const questions = (data.questions || []).map((q: any) => ({
    ...q,
    options: (q.options || []).sort((a: any, b: any) => a.order_index - b.order_index)
  })).sort((a: any, b: any) => a.order_index - b.order_index)

  // Attempt info for the caller (B65): how many attempts they have used.
  // NOTE: there is no max_attempts column on quizzes (verified in migrations);
  // MAX_QUIZ_ATTEMPTS below is the code default — keep in sync with
  // components/quiz/QuizTaker.tsx and app/dashboard/assignments/[id]/page.tsx.
  const { count: attemptCount } = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', id)
    .eq('user_id', user.id)

  return { ...data, questions, attemptCount: attemptCount ?? 0, maxAttempts: MAX_QUIZ_ATTEMPTS }
}

// Default attempt limit: the quizzes table has no max_attempts column
// (verified across all migrations in supabase/migrations/), so the limit
// lives in code. 3 attempts per quiz per user.
const MAX_QUIZ_ATTEMPTS = 3

export async function fetchQuizForLesson(lessonId: string): Promise<Quiz | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quizzes')
    .select('*').is('deleted_at', null)
    .eq('lesson_id', lessonId)
    .single()

  if (error || !data) return null
  return data
}

export async function fetchAllQuizzes(): Promise<(Quiz & { question_count: number, attempt_count: number })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return []

  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      questions:quiz_questions(id),
      attempts:quiz_attempts(id)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((q: any) => {
    const { questions, attempts, ...rest } = q
    return {
      ...rest,
      question_count: questions?.length || 0,
      attempt_count: attempts?.length || 0
    }
  })
}

export async function submitQuizAttempt(quizId: string, answers: { questionId: string; selectedOptionId: string }[]): Promise<ActionResult<QuizAttemptResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (!Array.isArray(answers)) return { error: 'Invalid answers' }

  const serviceClient = getServiceClient()

  // Grading path (only place is_correct is read): the full quiz incl.
  // quiz_options(*) is fetched server-side via the SERVICE client and never
  // leaves the server — student-facing reads (fetchQuiz, quiz page) select
  // only id/question_id/option_text/order_index. Keep it that way.
  const { data: quiz, error: quizError } = await serviceClient
    .from('quizzes')
    .select(`
      *,
      questions:quiz_questions(
        *,
        options:quiz_options(*)
      )
    `)
    .eq('id', quizId)
    .single()

  if (quizError || !quiz) return { error: 'Quiz not found' }

  // Published/availability gate: quizzes have no status/published column
  // (verified in migrations) — a soft-deleted quiz is the unavailable one.
  if ((quiz as any).deleted_at) return { error: 'This quiz is no longer available' }

  // Assignment/allowed gate (lesson-linked quizzes only): the lesson's course
  // must be published and not deleted. If that course actually assigns users
  // via course_assignments, the caller must be one of them; courses with no
  // assignments stay open to every student (matches the quiz list page,
  // which shows all non-deleted quizzes, and B31 open course visibility).
  // Tool-linked and standalone quizzes have no assignment mechanism, so
  // they are open to any authenticated student.
  if (quiz.lesson_id) {
    const { data: lesson } = await serviceClient
      .from('lessons')
      .select('id, deleted_at, module:modules(id, deleted_at, course:courses(id, status, deleted_at))')
      .eq('id', quiz.lesson_id)
      .maybeSingle()
    const course = (lesson as any)?.module?.course
    if (!lesson || (lesson as any).deleted_at || !course || course.deleted_at || course.status !== 'published') {
      return { error: 'This quiz is no longer available' }
    }
    const { data: courseAssignments } = await serviceClient
      .from('course_assignments')
      .select('user_id')
      .eq('course_id', course.id)
    if ((courseAssignments?.length ?? 0) > 0 && !courseAssignments!.some((a: any) => a.user_id === user.id)) {
      return { error: 'You are not assigned to this quiz' }
    }
  }

  // Attempt limit (S12/B65): no max_attempts column exists on quizzes, so
  // the default is MAX_QUIZ_ATTEMPTS (3) attempts per quiz per user, in code.
  const { count: priorAttempts } = await serviceClient
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
  if ((priorAttempts ?? 0) >= MAX_QUIZ_ATTEMPTS) {
    return { error: `Attempt limit reached — you have already used all ${MAX_QUIZ_ATTEMPTS} attempts for this quiz` }
  }

  // S12: dedupe caller-supplied answers by questionId (keep first) so the
  // same correct answer cannot be counted twice.
  const seenQuestionIds = new Set<string>()
  const dedupedAnswers = answers.filter(ans => {
    if (!ans || typeof ans.questionId !== 'string' || seenQuestionIds.has(ans.questionId)) return false
    seenQuestionIds.add(ans.questionId)
    return true
  })

  let score = 0
  let maxScore = 0
  let correctCount = 0
  const totalCount = quiz.questions?.length || 0

  const attemptAnswers = dedupedAnswers.map(ans => {
    const question = quiz.questions?.find((q: any) => q.id === ans.questionId)
    const points = question?.points || 0
    const selectedOption = question?.options?.find((o: any) => o.id === ans.selectedOptionId)
    const isCorrect = selectedOption?.is_correct || false

    if (isCorrect) {
      score += points
      correctCount += 1
    }

    return {
      question_id: ans.questionId,
      selected_option_id: ans.selectedOptionId,
      is_correct: isCorrect
    }
  })

  maxScore = (quiz.questions || []).reduce((sum: number, q: any) => sum + (q.points || 0), 0)
  // S12: cap percentage at 100 even if scoring ever inflates again.
  const percentage = maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0
  const passed = percentage >= quiz.pass_score

  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .insert([{
      quiz_id: quizId,
      user_id: user.id,
      score,
      max_score: maxScore,
      percentage,
      passed
    }])
    .select()
    .single()

  if (attemptError || !attempt) return { error: attemptError?.message || 'Failed to save attempt' }

  const { error: answersError } = await supabase
    .from('quiz_attempt_answers')
    .insert(
      attemptAnswers.map(ans => ({
        attempt_id: attempt.id,
        ...ans
      }))
    )

  if (answersError) {
    // B43: no true transaction spans the two inserts in Supabase, so
    // compensate — delete the just-created attempt row so no phantom
    // answer-less attempt is left behind or counted in stats.
    await supabase.from('quiz_attempts').delete().eq('id', attempt.id)
    return { error: answersError.message }
  }

  revalidatePath(`/dashboard/quiz/${quizId}`)
  return {
    data: {
      attemptId: attempt.id,
      score,
      maxScore,
      percentage,
      passed,
      correctCount,
      totalCount
    }
  }
}

export async function fetchMyAttempts(quizId: string): Promise<QuizAttempt[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })

  if (error || !data) return []
  return data
}

export async function fetchAttemptDetail(attemptId: string): Promise<QuizAttemptAnswer[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // B25: caller must own the attempt or be an admin — otherwise any
  // student could read any other student's quiz answers.
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('user_id')
    .eq('id', attemptId)
    .maybeSingle()
  if (!attempt) return []
  if (attempt.user_id !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return []
  }

  const { data, error } = await supabase
    .from('quiz_attempt_answers')
    .select(`
      *,
      question:quiz_questions(*),
      selected_option:quiz_options(*)
    `)
    .eq('attempt_id', attemptId)

  if (error || !data) return []
  return data
}

export async function fetchQuizStats(quizId: string): Promise<{ totalAttempts: number, avgPercentage: number, passRate: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalAttempts: 0, avgPercentage: 0, passRate: 0 }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { totalAttempts: 0, avgPercentage: 0, passRate: 0 }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('percentage, passed')
    .eq('quiz_id', quizId)

  if (error || !data || data.length === 0) {
    return { totalAttempts: 0, avgPercentage: 0, passRate: 0 }
  }

  const totalAttempts = data.length
  const avgPercentage = data.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
  const passCount = data.filter(a => a.passed).length
  const passRate = (passCount / totalAttempts) * 100

  return { totalAttempts, avgPercentage, passRate }
}

export async function deleteQuiz(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('quizzes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/quizzes')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function bulkSoftDeleteQuizzes(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('quizzes').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/quizzes')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
export async function syncQuizQuestions(quizId: string, questions: any[]): Promise<ActionResult> {
  // B45: whole body wrapped in try/catch so malformed input returns
  // { error } in the ActionResult shape instead of throwing a TypeError
  // out of the server action.
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { error: 'Unauthorized' }

    if (!Array.isArray(questions)) return { error: 'Invalid questions data: expected an array' }

    // We will get current questions
    const { data: currentQ } = await supabase.from('quiz_questions').select('id').eq('quiz_id', quizId)
    const currentQIds = (currentQ || []).map(q => q.id)

    const incomingQIds = questions
      .filter(q => q && typeof q.id === 'string' && !q.id.startsWith('new-'))
      .map(q => q.id)

    // Find which to delete
    const toDelete = currentQIds.filter(id => !incomingQIds.includes(id))

    if (toDelete.length > 0) {
      await supabase.from('quiz_questions').delete().in('id', toDelete)
    }

    // Upsert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q || typeof q !== 'object') return { error: `Invalid question at position ${i + 1}: expected an object` }
      if (typeof q.id !== 'string' || q.id.length === 0) return { error: `Invalid question at position ${i + 1}: missing id` }
      // Guard options before any .filter/.length call (B45).
      const options = Array.isArray(q.options) ? q.options : []
      let qId = q.id
      if (qId.startsWith('new-')) {
        const { data: insertedQ, error: iErr } = await supabase.from('quiz_questions').insert({
          quiz_id: quizId,
          question_text: q.question_text,
          points: q.points || 1,
          order_index: i
        }).select().single()
        if (iErr) return { error: iErr.message }
        if (!insertedQ) return { error: 'Failed to create question' }
        qId = insertedQ.id
      } else {
        const { error: uErr } = await supabase.from('quiz_questions').update({
          question_text: q.question_text,
          points: q.points || 1,
          order_index: i
        }).eq('id', qId)
        if (uErr) return { error: uErr.message }
      }

      // Now options
      const { data: currentO } = await supabase.from('quiz_options').select('id').eq('question_id', qId)
      const currentOIds = (currentO || []).map(o => o.id)
      const incomingOIds = options
        .filter((o: any) => o && typeof o.id === 'string' && !o.id.startsWith('new-'))
        .map((o: any) => o.id)

      const toDeleteO = currentOIds.filter(id => !incomingOIds.includes(id))
      if (toDeleteO.length > 0) {
        await supabase.from('quiz_options').delete().in('id', toDeleteO)
      }

      for (let j = 0; j < options.length; j++) {
        const o = options[j]
        if (!o || typeof o !== 'object') return { error: `Invalid option at question ${i + 1}, position ${j + 1}: expected an object` }
        if (typeof o.id !== 'string' || o.id.length === 0) return { error: `Invalid option at question ${i + 1}, position ${j + 1}: missing id` }
        if (o.id.startsWith('new-')) {
          const { error: oiErr } = await supabase.from('quiz_options').insert({
            question_id: qId,
            option_text: o.option_text,
            is_correct: o.is_correct,
            order_index: j
          })
          if (oiErr) return { error: oiErr.message }
        } else {
          const { error: ouErr } = await supabase.from('quiz_options').update({
            option_text: o.option_text,
            is_correct: o.is_correct,
            order_index: j
          }).eq('id', o.id)
          if (ouErr) return { error: ouErr.message }
        }
      }
    }

    revalidatePath(`/admin/quizzes/${quizId}`)
    revalidatePath('/admin/quizzes')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error)?.message || 'Failed to sync quiz questions' }
  }
}

const GEMINI_MODELS_QZ = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest']

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }], role: 'user' }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 4096, responseMimeType: 'application/json' },
  })
  for (const model of GEMINI_MODELS_QZ) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    if (!res.ok) continue
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) return text
  }
  throw new Error('AI unavailable — please try again')
}

export interface GeneratedQuestion {
  id: string
  question_text: string
  points: number
  explanation: string
  options: { id: string; option_text: string; is_correct: boolean }[]
}

export async function generateQuestionsForQuiz(
  quizId: string,
  count: number = 8,
): Promise<ActionResult<GeneratedQuestion[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data: quiz } = await supabase.from('quizzes').select('*, tool:tools(id, name)').is('deleted_at', null).eq('id', quizId).single()
  if (!quiz) return { error: 'Quiz not found' }

  const toolId = quiz.tool_id
  const toolName = (quiz.tool as any)?.name || quiz.title

  let contextParts: string[] = []

  if (toolId) {
    const [faqsRes, scriptsRes, objectionsRes] = await Promise.all([
      supabase.from('faqs').select('question, short_answer').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').limit(10),
      supabase.from('scripts').select('title, content').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').limit(6),
      supabase.from('objections').select('objection_text, recommended_response').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').limit(6),
    ])
    const faqs = faqsRes.data || []
    const scripts = scriptsRes.data || []
    const objections = objectionsRes.data || []

    if (faqs.length) {
      contextParts.push('FAQs:')
      faqs.forEach((f: any) => contextParts.push(`Q: ${f.question}\nA: ${f.short_answer}`))
    }
    if (scripts.length) {
      contextParts.push('\nScripts:')
      scripts.forEach((s: any) => contextParts.push(`[${s.title}]: ${s.content?.slice(0, 200)}`))
    }
    if (objections.length) {
      contextParts.push('\nObjection Handling:')
      objections.forEach((o: any) => contextParts.push(`Objection: ${o.objection_text}\nResponse: ${o.recommended_response?.slice(0, 150)}`))
    }
  }

  if (contextParts.length === 0) {
    contextParts.push(`Quiz topic: ${quiz.title}`)
    if (quiz.description) contextParts.push(`Description: ${quiz.description}`)
  }

  const prompt = `You are creating a sales training quiz for "${toolName}".

Based on this training content:
${contextParts.join('\n')}

Generate exactly ${count} multiple-choice questions to test a salesman's knowledge.
Each question must have exactly 4 options with exactly 1 correct answer.
Mix difficulty: some easy recall, some applied scenario questions.

Return ONLY valid JSON, no markdown, no explanation:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Brief explanation of why this is correct",
      "points": 1
    }
  ]
}`

  try {
    const raw = await callGemini(prompt)
    const clean = stripFences(raw)
    const parsed = JSON.parse(clean)
    if (!parsed.questions?.length) return { error: 'AI returned no questions — try again' }

    const now = Date.now()
    const questions: GeneratedQuestion[] = parsed.questions.map((q: any, i: number) => ({
      id: `new-${now}-${i}`,
      question_text: q.question,
      points: q.points || 1,
      explanation: q.explanation || '',
      options: (q.options as string[]).map((opt: string, j: number) => ({
        id: `new-opt-${now}-${i}-${j}`,
        option_text: opt,
        is_correct: j === q.correct_index,
      })),
    }))

    return { data: questions }
  } catch (e: any) {
    return { error: e.message || 'AI generation failed' }
  }
}

// Generate questions from admin-selected specific content items (not whole tool)
export async function generateQuestionsFromContent(
  quizId: string,
  selectedItems: { type: 'faq' | 'script' | 'objection'; id: string }[],
  count: number = 8,
): Promise<ActionResult<GeneratedQuestion[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data: quiz } = await supabase.from('quizzes').select('title, tool:tools(name)').is('deleted_at', null).eq('id', quizId).single()
  if (!quiz) return { error: 'Quiz not found' }

  const toolName = (quiz.tool as any)?.name || quiz.title
  const contextParts: string[] = []

  const faqIds = selectedItems.filter(i => i.type === 'faq').map(i => i.id)
  const scriptIds = selectedItems.filter(i => i.type === 'script').map(i => i.id)
  const objectionIds = selectedItems.filter(i => i.type === 'objection').map(i => i.id)

  if (faqIds.length > 0) {
    const { data: faqs } = await supabase.from('faqs').select('question, short_answer').in('id', faqIds)
    if (faqs?.length) {
      contextParts.push('FAQs:')
      faqs.forEach((f: any) => contextParts.push(`Q: ${f.question}\nA: ${f.short_answer}`))
    }
  }
  if (scriptIds.length > 0) {
    const { data: scripts } = await supabase.from('scripts').select('title, content').in('id', scriptIds)
    if (scripts?.length) {
      contextParts.push('\nScripts:')
      scripts.forEach((s: any) => contextParts.push(`[${s.title}]: ${s.content?.slice(0, 300)}`))
    }
  }
  if (objectionIds.length > 0) {
    const { data: objections } = await supabase.from('objections').select('objection_text, recommended_response').in('id', objectionIds)
    if (objections?.length) {
      contextParts.push('\nObjection Handling:')
      objections.forEach((o: any) => contextParts.push(`Objection: ${o.objection_text}\nResponse: ${o.recommended_response?.slice(0, 200)}`))
    }
  }

  if (contextParts.length === 0) return { error: 'No content found for selected items' }

  const prompt = `You are creating a sales training quiz for "${toolName}".

Based ONLY on this specific content (do not add outside knowledge):
${contextParts.join('\n')}

Generate exactly ${count} multiple-choice questions to test a salesman's knowledge of the content above.
Each question must have exactly 4 options with exactly 1 correct answer.
Questions must be directly grounded in the provided content — do not invent facts not present above.

Return ONLY valid JSON, no markdown, no explanation:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Brief explanation of why this is correct",
      "points": 1
    }
  ]
}`

  try {
    const raw = await callGemini(prompt)
    const clean = stripFences(raw)
    const parsed = JSON.parse(clean)
    if (!parsed.questions?.length) return { error: 'AI returned no questions — try again' }

    const now = Date.now()
    const questions: GeneratedQuestion[] = parsed.questions.map((q: any, i: number) => ({
      id: `new-${now}-${i}`,
      question_text: q.question,
      points: q.points || 1,
      explanation: q.explanation || '',
      options: (q.options as string[]).map((opt: string, j: number) => ({
        id: `new-opt-${now}-${i}-${j}`,
        option_text: opt,
        is_correct: j === q.correct_index,
      })),
    }))

    return { data: questions }
  } catch (e: any) {
    return { error: e.message || 'AI generation failed' }
  }
}
