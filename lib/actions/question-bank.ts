'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

// Audit §3 #9 — reusable question bank. Admin-gated throughout; staff
// never writes here (reads are covered by the authenticated-SELECT RLS
// policy in migration 049).

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export interface BankOptionInput {
  option_text: string
  is_correct: boolean
}

export interface BankOption {
  id: string
  question_bank_id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

export interface BankQuestion {
  id: string
  question_text: string
  category: string | null
  tool_id: string | null
  created_by: string | null
  created_at: string
  options?: BankOption[]
  tool?: { id: string; name: string } | null
}

export interface CreateBankQuestionInput {
  question_text: string
  category?: string | null
  tool_id?: string | null
  options: BankOptionInput[]
}

function validateOptions(options: BankOptionInput[]): string | null {
  if (!Array.isArray(options) || options.length < 2) {
    return 'A question needs at least 2 options'
  }
  if (options.some(o => !o || typeof o.option_text !== 'string' || !o.option_text.trim())) {
    return 'Every option needs text'
  }
  const correctCount = options.filter(o => o.is_correct === true).length
  if (correctCount !== 1) {
    return 'Exactly one option must be marked correct'
  }
  return null
}

export async function createBankQuestion(
  input: CreateBankQuestionInput
): Promise<ActionResult<BankQuestion>> {
  try {
    const { supabase, user } = await requireAdmin()

    const questionText = input.question_text?.trim()
    if (!questionText) return { error: 'Question text is required' }
    const optionsError = validateOptions(input.options)
    if (optionsError) return { error: optionsError }

    const { data: question, error: qErr } = await supabase
      .from('question_bank')
      .insert([{
        question_text: questionText,
        category: input.category?.trim() || null,
        tool_id: input.tool_id || null,
        created_by: user.id,
      }])
      .select()
      .single()

    if (qErr || !question) return { error: qErr?.message || 'Failed to create bank question' }

    const { data: options, error: oErr } = await supabase
      .from('question_bank_options')
      .insert(
        input.options.map((o, i) => ({
          question_bank_id: question.id,
          option_text: o.option_text.trim(),
          is_correct: o.is_correct,
          order_index: i,
        }))
      )
      .select()

    if (oErr) {
      // No partial bank question: options failed, roll the question back.
      await supabase.from('question_bank').delete().eq('id', question.id)
      return { error: oErr.message }
    }

    revalidatePath('/admin/question-bank')
    return { data: { ...question, options: options || [] } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function fetchBankQuestions(filters?: {
  category?: string
  tool_id?: string
  search?: string
}): Promise<ActionResult<BankQuestion[]>> {
  try {
    const { supabase } = await requireAdmin()

    let query = supabase
      .from('question_bank')
      .select('*, options:question_bank_options(*), tool:tools(id, name)')
      .order('created_at', { ascending: false })

    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.tool_id) query = query.eq('tool_id', filters.tool_id)
    if (filters?.search) query = query.ilike('question_text', `%${filters.search}%`)

    const { data, error } = await query
    if (error) return { error: error.message }

    const rows = (data || []).map((q: any) => ({
      ...q,
      options: (q.options || []).sort((a: any, b: any) => a.order_index - b.order_index),
    }))
    return { data: rows }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function fetchBankCategories(): Promise<ActionResult<string[]>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('question_bank')
      .select('category')
      .not('category', 'is', null)
      .order('category')
    if (error) return { error: error.message }
    const categories = Array.from(
      new Set((data || []).map((r: any) => r.category).filter(Boolean))
    ) as string[]
    return { data: categories }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateBankQuestion(
  id: string,
  input: Partial<CreateBankQuestionInput>
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()

    if (input.options !== undefined) {
      const optionsError = validateOptions(input.options)
      if (optionsError) return { error: optionsError }
    }
    if (input.question_text !== undefined && !input.question_text.trim()) {
      return { error: 'Question text is required' }
    }

    const patch: Record<string, unknown> = {}
    if (input.question_text !== undefined) patch.question_text = input.question_text.trim()
    if (input.category !== undefined) patch.category = input.category?.trim() || null
    if (input.tool_id !== undefined) patch.tool_id = input.tool_id || null

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('question_bank').update(patch).eq('id', id)
      if (error) return { error: error.message }
    }

    if (input.options !== undefined) {
      const { error: delErr } = await supabase
        .from('question_bank_options')
        .delete()
        .eq('question_bank_id', id)
      if (delErr) return { error: delErr.message }

      const { error: insErr } = await supabase
        .from('question_bank_options')
        .insert(
          input.options.map((o, i) => ({
            question_bank_id: id,
            option_text: o.option_text.trim(),
            is_correct: o.is_correct,
            order_index: i,
          }))
        )
      if (insErr) return { error: insErr.message }
    }

    revalidatePath('/admin/question-bank')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteBankQuestion(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    // question_bank_options rows cascade-delete via the FK.
    const { error } = await supabase.from('question_bank').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/question-bank')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function importBankQuestionIntoQuiz(
  bankQuestionId: string,
  quizId: string
): Promise<ActionResult<{ questionId: string }>> {
  try {
    const { supabase } = await requireAdmin()

    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', quizId)
      .is('deleted_at', null)
      .maybeSingle()
    if (quizErr) return { error: quizErr.message }
    if (!quiz) return { error: 'Quiz not found' }

    const { data: bank, error: bankErr } = await supabase
      .from('question_bank')
      .select('*, options:question_bank_options(*)')
      .eq('id', bankQuestionId)
      .single()
    if (bankErr || !bank) return { error: bankErr?.message || 'Bank question not found' }

    const options = (bank.options || []).sort(
      (a: any, b: any) => a.order_index - b.order_index
    )
    if (options.length === 0) return { error: 'Bank question has no options to import' }

    // Append after the last existing question (same insert pattern as
    // syncQuizQuestions / generateAndSaveToolQuiz: insert question, then
    // its options with order_index preserved).
    const { data: existing } = await supabase
      .from('quiz_questions')
      .select('order_index')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: false })
      .limit(1)
    const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

    const { data: question, error: qErr } = await supabase
      .from('quiz_questions')
      .insert([{
        quiz_id: quizId,
        question_text: bank.question_text,
        points: 1,
        order_index: nextIndex,
      }])
      .select()
      .single()
    if (qErr || !question) return { error: qErr?.message || 'Failed to add question to quiz' }

    const { error: oErr } = await supabase
      .from('quiz_options')
      .insert(
        options.map((o: any, i: number) => ({
          question_id: question.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: o.order_index ?? i,
        }))
      )
    if (oErr) {
      await supabase.from('quiz_questions').delete().eq('id', question.id)
      return { error: oErr.message }
    }

    revalidatePath(`/admin/quizzes/${quizId}`)
    revalidatePath('/admin/quizzes')
    revalidatePath('/admin/question-bank')
    return { data: { questionId: question.id } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
