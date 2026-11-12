'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
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

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function approveQuizAttempt(attemptId: string): Promise<ActionResult> {
  try {
    // Admin check first (anon client, session-bound), then the UPDATE runs
    // via the SERVICE client: quiz_attempts has no UPDATE RLS policy, so the
    // anon-client update always failed RLS (audit S16) and the approval
    // workflow could never work live. The service client is safe here
    // because requireAdmin() above has already verified an admin session;
    // this matches the repo's pattern for other admin mutations
    // (e.g. enrollment approve). It also works whether or not the separate
    // UPDATE-policy migration lands — no reliance on the new policy.
    await requireAdmin()
    const serviceClient = getServiceClient()
    const { error } = await serviceClient
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
    await requireAdmin()
    const serviceClient = getServiceClient()
    const { error } = await serviceClient
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
