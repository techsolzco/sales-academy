'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { ActionResult, Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAttemptAnswer, QuizAttemptResult } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createQuiz(input: { title: string, description?: string, lesson_id?: string, pass_score?: number }): Promise<ActionResult<Quiz>> {
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

export async function updateQuiz(id: string, input: Partial<{ title: string; description: string; lesson_id: string; pass_score: number }>): Promise<ActionResult> {
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

export async function fetchQuiz(id: string): Promise<(Quiz & { questions: (QuizQuestion & { options: QuizOption[] })[] }) | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      questions:quiz_questions(
        *,
        options:quiz_options(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Sort questions and options
  const questions = (data.questions || []).map((q: any) => ({
    ...q,
    options: (q.options || []).sort((a: any, b: any) => a.order_index - b.order_index)
  })).sort((a: any, b: any) => a.order_index - b.order_index)

  return { ...data, questions }
}

export async function fetchQuizForLesson(lessonId: string): Promise<Quiz | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
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

  const serviceClient = getServiceClient()
  
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

  let score = 0
  let maxScore = 0
  let correctCount = 0
  const totalCount = quiz.questions?.length || 0

  const attemptAnswers = answers.map(ans => {
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
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
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

  if (answersError) return { error: answersError.message }

  revalidatePath(`/dashboard/quizzes/${quizId}`)
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
