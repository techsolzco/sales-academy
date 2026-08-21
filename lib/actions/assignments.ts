'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Assignment, AssignmentSubmission } from '@/types'

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

// Assign specific users to a course
export async function assignUsers(
  courseId: string,
  userIds: string[]
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin()
    const rows = userIds.map(uid => ({
      course_id: courseId,
      user_id: uid,
      assigned_by: user.id,
    }))
    const { error } = await supabase
      .from('course_assignments')
      .upsert(rows, { onConflict: 'course_id,user_id' })
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/assign`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Assign all active salesmen to a course
export async function assignAllSalesmen(courseId: string): Promise<ActionResult<{ count: number }>> {
  try {
    const { supabase, user } = await requireAdmin()
    const { data: salesmen, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'salesman')
      .eq('status', 'active')
    if (fetchError) return { error: fetchError.message }
    const rows = (salesmen ?? []).map(s => ({
      course_id: courseId,
      user_id: s.id,
      assigned_by: user.id,
    }))
    if (rows.length === 0) return { data: { count: 0 } }
    const { error } = await supabase
      .from('course_assignments')
      .upsert(rows, { onConflict: 'course_id,user_id' })
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/assign`)
    return { data: { count: rows.length } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Remove a user's assignment from a course
export async function unassignUser(courseId: string, userId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('course_assignments')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/assign`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// SCORING WEIGHTS comment: assignments don't affect leaderboard score directly

export async function createAssignment(input: { title: string, instructions: string, due_date?: string, course_id?: string, lesson_id?: string }): Promise<ActionResult<Assignment>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('assignments')
    .insert([{ ...input, created_by: user.id }])
    .select()
    .single()

  if (error || !data) return { error: error?.message || 'Failed to create assignment' }
  revalidatePath('/admin/assignments')
  return { data }
}

export async function fetchAssignments(): Promise<Assignment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      course:courses(id, name),
      lesson:lessons(id, title)
    `)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data
}

export async function fetchMyAssignments(): Promise<(Assignment & { submission: AssignmentSubmission | null })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      course:courses(id, name),
      lesson:lessons(id, title),
      assignment_submissions(*)
    `)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((assignment: any) => {
    const submissions = assignment.assignment_submissions || []
    const mySubmission = submissions.find((s: any) => s.user_id === user.id) || null
    const { assignment_submissions, ...rest } = assignment
    return {
      ...rest,
      submission: mySubmission
    }
  })
}

export async function submitAssignment(assignmentId: string, responseText?: string, fileUrl?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('assignment_submissions')
    .insert([{ assignment_id: assignmentId, user_id: user.id, response_text: responseText, file_url: fileUrl }])

  if (error) return { error: error.message }

  const serviceClient = getServiceClient()
  
  const { data: assignment } = await serviceClient.from('assignments').select('title').is('deleted_at', null).eq('id', assignmentId).single()
  const title = assignment?.title || 'Unknown Assignment'

  const { data: admins } = await serviceClient.from('profiles').select('id').eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifs = admins.map((a: any) => ({
      user_id: a.id,
      title: `New assignment submission: ${title}`,
      body: `A new submission has been made for the assignment.`,
      type: 'system',
      link: `/admin/assignments/${assignmentId}`,
    }))
    await serviceClient.from('notifications').insert(notifs)
  }

  revalidatePath('/dashboard/assignments')
  return { data: undefined }
}

export async function reviewSubmission(submissionId: string, status: 'approved' | 'rejected', feedback?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data: submission, error } = await supabase
    .from('assignment_submissions')
    .update({ status, feedback, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', submissionId)
    .select('*, assignment:assignments(title)')
    .single()

  if (error || !submission) return { error: error?.message || 'Failed to review submission' }

  const serviceClient = getServiceClient()
  await serviceClient.from('notifications').insert({
    user_id: submission.user_id,
    title: `Your assignment was ${status}`,
    body: feedback || `Your submission for ${submission.assignment?.title} has been ${status}.`,
    type: 'system',
    link: `/dashboard/assignments`,
  })

  revalidatePath(`/admin/assignments/${submission.assignment_id}`)
  return { data: undefined }
}

export async function fetchAllSubmissions(assignmentId?: string): Promise<AssignmentSubmission[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return []

  let query = supabase
    .from('assignment_submissions')
    .select(`
      *,
      profile:profiles!user_id(id, full_name, email, avatar_url),
      assignment:assignments(id, title)
    `)
    .order('submitted_at', { ascending: false })

  if (assignmentId) {
    query = query.eq('assignment_id', assignmentId)
  }

  const { data, error } = await query
  if (error) return []
  return data as any
}

export async function updateAssignment(id: string, input: Partial<Assignment>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('assignments')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/assignments')
  return { data: undefined }
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('assignments').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/assignments')
  return { data: undefined }
}


export async function bulkSoftDeleteAssignments(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('assignments').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/assignments')
    
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
