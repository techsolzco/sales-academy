'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
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

export async function createAssignment(input: {
  title: string
  instructions: string
  due_date?: string
  tool_id?: string | null
  quiz_id?: string | null
  course_id?: string | null
  lesson_id?: string | null
}): Promise<ActionResult<Assignment>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('assignments')
    .insert([{
      title: input.title,
      instructions: input.instructions,
      due_date: input.due_date || null,
      tool_id: input.tool_id || null,
      quiz_id: input.quiz_id || null,
      course_id: input.course_id || null,
      lesson_id: input.lesson_id || null,
      created_by: user.id,
    }])
    .select()
    .single()

  if (error || !data) return { error: error?.message || 'Failed to create assignment' }
  revalidatePath('/admin/assignments')
  return { data }
}

export async function fetchAssignments(): Promise<Assignment[]> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        tool:tools(id, name),
        quiz:quizzes(id, title)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

interface AssignmentScope {
  courseIds: string[]
  toolIds: string[]
  lessonIds: string[]
}

// The courses/tools/lessons an assignment can be reached through for one
// user: the courses they are assigned to, the tools of those courses, and
// the lessons inside them.
async function getAssignmentScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<AssignmentScope> {
  const { data: assigned } = await supabase
    .from('course_assignments')
    .select('course_id')
    .eq('user_id', userId)
  const courseIds = (assigned ?? []).map(a => a.course_id)
  if (courseIds.length === 0) return { courseIds: [], toolIds: [], lessonIds: [] }

  const [{ data: courses }, { data: modules }] = await Promise.all([
    supabase.from('courses').select('id, tool_id').in('id', courseIds),
    supabase.from('modules').select('id').is('deleted_at', null).in('course_id', courseIds),
  ])
  const toolIds = (courses ?? []).map(c => c.tool_id).filter((t): t is string => !!t)
  const moduleIds = (modules ?? []).map(m => m.id)
  const { data: lessons } = moduleIds.length > 0
    ? await supabase.from('lessons').select('id').is('deleted_at', null).in('module_id', moduleIds)
    : { data: [] }
  return { courseIds, toolIds, lessonIds: (lessons ?? []).map(l => l.id) }
}

// An assignment is visible/assigned to the user when it links to one of
// their assigned courses, tools or lessons — or when it links to nothing
// at all (a general assignment, visible to every salesman).
function isAssignmentInScope(
  assignment: { course_id?: string | null; tool_id?: string | null; lesson_id?: string | null },
  scope: AssignmentScope
): boolean {
  if (!assignment.course_id && !assignment.tool_id && !assignment.lesson_id) return true
  if (assignment.course_id && scope.courseIds.includes(assignment.course_id)) return true
  if (assignment.tool_id && scope.toolIds.includes(assignment.tool_id)) return true
  if (assignment.lesson_id && scope.lessonIds.includes(assignment.lesson_id)) return true
  return false
}

export async function fetchMyAssignments(): Promise<(Assignment & { submission: AssignmentSubmission | null })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  // Impersonation-aware: an admin viewing as a student sees that
  // student's assignments, matching the other training read paths.
  const { userId } = await getEffectiveUser()

  const scope = await getAssignmentScope(supabase, userId)

  // Scope server-side: only assignments for the caller's assigned
  // courses/tools/lessons (plus unlinked general assignments).
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      tool:tools(id, name),
      quiz:quizzes(id, title),
      course:courses(title)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const visible = (data as any[]).filter(a => isAssignmentInScope(a, scope))
  const visibleIds = visible.map(a => a.id)

  // The caller's own submissions only, fetched server-side (never all
  // users' submissions filtered in the browser).
  const { data: mySubmissions } = visibleIds.length > 0
    ? await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('user_id', userId)
        .in('assignment_id', visibleIds)
    : { data: [] }
  const submissionByAssignment = new Map(
    ((mySubmissions ?? []) as any[]).map(s => [s.assignment_id, s])
  )

  return visible.map((assignment: any) => ({
    ...assignment,
    submission: (submissionByAssignment.get(assignment.id) as AssignmentSubmission | undefined) || null
  }))
}

export async function submitAssignment(
  assignmentId: string,
  responseText?: string,
  fileUrl?: string,
  imageUrl?: string,
  mediaLink?: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // The assignment must exist and be assigned to the submitter. There is
  // no status/published column on assignments — "assigned" means it links
  // to one of the submitter's assigned courses, tools or lessons, or to
  // nothing at all (a general assignment open to every salesman).
  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, course_id, tool_id, lesson_id')
    .is('deleted_at', null)
    .eq('id', assignmentId)
    .maybeSingle()
  if (!assignment) return { error: 'Assignment not found.' }
  const scope = await getAssignmentScope(supabase, user.id)
  if (!isAssignmentInScope(assignment, scope)) {
    return { error: 'This assignment is not assigned to you.' }
  }

  // Friendly duplicate check instead of a raw Postgres unique-violation.
  const { data: existing } = await supabase
    .from('assignment_submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return { error: 'You have already submitted this assignment.' }

  const { error } = await supabase
    .from('assignment_submissions')
    .insert([{
      assignment_id: assignmentId,
      user_id: user.id,
      response_text: responseText || null,
      file_url: fileUrl || null,
      image_url: imageUrl || null,
      media_link: mediaLink || null,
    }])

  if (error) return { error: error.message }

  const serviceClient = getServiceClient()
  const { data: assignmentRow } = await serviceClient.from('assignments').select('title').is('deleted_at', null).eq('id', assignmentId).single()
  const title = assignmentRow?.title || 'Unknown Assignment'
  const { data: admins } = await serviceClient.from('profiles').select('id').eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifs = admins.map((a: any) => ({
      user_id: a.id,
      title: `New assignment submission: ${title}`,
      body: 'A new submission has been made for the assignment.',
      type: 'system',
      link: `/admin/assignments/${assignmentId}`,
    }))
    await serviceClient.from('notifications').insert(notifs)
  }

  revalidatePath('/dashboard/assignments')
  return { data: undefined }
}

export async function reviewSubmission(
  submissionId: string,
  status: 'approved' | 'rejected',
  feedback?: string,
  score?: number | null,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // Max score is 100 — the student UI renders score/100 (see
  // app/dashboard/assignments/[id]/page.tsx) and migration
  // 024_assignment_enhancements.sql documents score as 0–100.
  if (score !== undefined && score !== null && (typeof score !== 'number' || score < 0 || score > 100)) {
    return { error: 'Score must be between 0 and 100.' }
  }

  // Refuse to re-grade: only a pending submission may be reviewed.
  const { data: existingSubmission } = await supabase
    .from('assignment_submissions')
    .select('id, status')
    .eq('id', submissionId)
    .maybeSingle()
  if (!existingSubmission) return { error: 'Submission not found.' }
  if (existingSubmission.status !== 'pending') {
    return { error: `This submission has already been ${existingSubmission.status} and cannot be graded again.` }
  }

  const updateData: any = {
    status,
    feedback: feedback || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }
  if (score !== undefined && score !== null) updateData.score = score

  const { data: submission, error } = await supabase
    .from('assignment_submissions')
    .update(updateData)
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
    link: '/dashboard/assignments',
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

export interface ContentItem {
  content_type: 'faq' | 'script' | 'objection'
  content_id: string
  content_title: string
}

export async function saveAssignmentContentItems(
  assignmentId: string,
  items: ContentItem[],
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // Replace all content items for this assignment
  await supabase.from('assignment_content_items').delete().eq('assignment_id', assignmentId)

  if (items.length === 0) return { data: undefined }

  const rows = items.map(i => ({ assignment_id: assignmentId, ...i }))
  const { error } = await supabase.from('assignment_content_items').insert(rows)
  if (error) return { error: error.message }
  return { data: undefined }
}

export async function fetchAssignmentContentItems(
  assignmentId: string,
): Promise<ContentItem[]> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('assignment_content_items')
      .select('content_type, content_id, content_title')
      .eq('assignment_id', assignmentId)
      .order('content_type')
    if (error || !data) return []
    return data as ContentItem[]
  } catch {
    return []
  }
}

