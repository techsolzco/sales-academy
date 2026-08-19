'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function approveQuizAttempt(attemptId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('quiz_attempts')
      .update({ approval_status: 'approved' })
      .eq('id', attemptId)
    if (error) return { error: error.message }
    revalidatePath('/admin/assignments/quiz-results')
    return { data: undefined }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function rejectQuizAttempt(attemptId: string, notes: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('quiz_attempts')
      .update({ approval_status: 'rejected', admin_notes: notes })
      .eq('id', attemptId)
    if (error) return { error: error.message }
    revalidatePath('/admin/assignments/quiz-results')
    return { data: undefined }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function fetchPendingQuizAttempts() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('quiz_attempts')
    .select('*, quiz:quizzes(title, tool_id), profile:profiles(full_name, email, avatar_url)')
    .eq('approval_status', 'pending')
    .order('submitted_at', { ascending: false })
  return data ?? []
}

export async function fetchReviewedQuizAttempts() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('quiz_attempts')
    .select('*, quiz:quizzes(title, tool_id), profile:profiles(full_name, email, avatar_url)')
    .in('approval_status', ['approved', 'rejected'])
    .order('submitted_at', { ascending: false })
  return data ?? []
}
