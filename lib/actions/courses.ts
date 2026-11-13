'use server'

import { createClient } from '@/lib/supabase/server'
import { isCourseComplete } from '@/lib/training-progress'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ActionResult, Course, Status, Difficulty, Visibility } from '@/types'

// ─── Auth guard ───────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

// ─── Input types ──────────────────────────────────────────────────────────

export interface CourseInput {
  title: string
  description?: string
  thumbnail_url?: string
  category?: string
  difficulty?: Difficulty
  estimated_duration_minutes?: number
  status?: Status
  visibility?: Visibility
  qualifying_for_reseller?: boolean
  tool_id?: string | null
}

// ─── Course content items ──────────────────────────────────────────────────

export interface CourseContentItem {
  content_type: 'faq' | 'script' | 'objection' | 'quiz'
  content_id: string
  content_title: string
}


// ─── Create ───────────────────────────────────────────────────────────────

export async function createCourse(input: CourseInput): Promise<ActionResult<Course>> {
  try {
    const { supabase, user } = await requireAdmin()
    const { data, error } = await supabase
      .from('courses')
      .insert({ ...input, created_by: user.id, status: input.status ?? 'draft' })
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/courses')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ─── Update ───────────────────────────────────────────────────────────────

export async function updateCourse(id: string, input: Partial<CourseInput>): Promise<ActionResult<Course>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('courses')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${id}`)
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ─── Status shortcuts ─────────────────────────────────────────────────────

export async function publishCourse(id: string): Promise<ActionResult<Course>> {
  return updateCourse(id, { status: 'published' })
}

export async function archiveCourse(id: string): Promise<ActionResult<Course>> {
  return updateCourse(id, { status: 'archived' })
}

export async function unpublishCourse(id: string): Promise<ActionResult<Course>> {
  return updateCourse(id, { status: 'draft' })
}

// ─── Delete ───────────────────────────────────────────────────────────────

export async function deleteCourse(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const deletedAt = new Date().toISOString()
    const { error } = await supabase.from('courses').update({ deleted_at: deletedAt }).eq('id', id)
    if (error) return { error: error.message }
    // Soft-delete the course's modules and lessons too, so no orphaned
    // child rows stay live/counted (B74).
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', id)
    const moduleIds = (modules ?? []).map(m => m.id)
    if (moduleIds.length > 0) {
      const { error: modError } = await supabase
        .from('modules')
        .update({ deleted_at: deletedAt })
        .in('id', moduleIds)
      if (modError) return { error: modError.message }
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({ deleted_at: deletedAt })
        .in('module_id', moduleIds)
      if (lessonError) return { error: lessonError.message }
    }
    revalidatePath('/admin/courses')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ─── Delete + redirect ────────────────────────────────────────────────────

export async function deleteCourseAndRedirect(id: string) {
  const result = await deleteCourse(id)
  if (!result.error) redirect('/admin/courses')
}

export async function bulkSoftDeleteCourses(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('courses').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/courses')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ─── Course content items ──────────────────────────────────────────────────

export async function saveCourseContentItems(
  courseId: string,
  items: CourseContentItem[],
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    // Full replace: delete all existing, then reinsert
    const { error: delErr } = await supabase
      .from('course_content_items')
      .delete()
      .eq('course_id', courseId)
    if (delErr) return { error: delErr.message }

    if (items.length > 0) {
      const rows = items.map((item, i) => ({
        course_id: courseId,
        content_type: item.content_type,
        content_id: item.content_id,
        content_title: item.content_title,
        display_order: i,
      }))
      const { error: insErr } = await supabase
        .from('course_content_items')
        .insert(rows)
      if (insErr) return { error: insErr.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function fetchCourseContentItems(
  courseId: string,
): Promise<CourseContentItem[]> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('course_content_items')
      .select('content_type, content_id, content_title, display_order')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true })
    if (error || !data) return []
    return data as CourseContentItem[]
  } catch {
    return []
  }
}

// ─── Course prerequisites (audit §3 #17) ────────────────────────────────────
// Types are defined locally in this file (shared types/index.ts is not
// edited — other agents are working in parallel).

export interface PrerequisiteCourse {
  id: string
  title: string
}

export interface TrainingAccess {
  course_id: string
  locked: boolean
  missing: PrerequisiteCourse[]
}

// Walk the prerequisite graph from `startId` following
// course -> required_course edges. Returns true if `targetId` is reachable
// (i.e. adding an edge into `startId`'s subtree would create a cycle).
// Depth guard of 20: a legitimate learning path is far shorter, and the
// guard also stops an infinite walk if the table ever holds a cycle.
async function wouldCreateCycle(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  startId: string,
  targetId: string,
): Promise<boolean> {
  const MAX_DEPTH = 20
  const seen = new Set<string>()
  let frontier = [startId]
  for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth++) {
    const { data } = await supabase
      .from('course_prerequisites')
      .select('required_course_id')
      .in('course_id', frontier)
    const next = (data ?? []).map(r => r.required_course_id as string)
    if (next.includes(targetId)) return true
    frontier = next.filter(id => !seen.has(id))
    next.forEach(id => seen.add(id))
  }
  return false
}

async function courseExists(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  courseId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()
  return !!data
}

// Admin: require `requiredCourseId` before `courseId` can be opened.
export async function addPrerequisite(
  courseId: string,
  requiredCourseId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    if (courseId === requiredCourseId) {
      return { error: 'A course cannot require itself.' }
    }
    const [courseOk, requiredOk] = await Promise.all([
      courseExists(supabase, courseId),
      courseExists(supabase, requiredCourseId),
    ])
    if (!courseOk) return { error: 'Course not found.' }
    if (!requiredOk) return { error: 'Required course not found.' }
    // Adding courseId -> requiredCourseId creates a cycle iff
    // requiredCourseId already (transitively) requires courseId.
    if (await wouldCreateCycle(supabase, requiredCourseId, courseId)) {
      return { error: 'This would create a circular prerequisite chain.' }
    }
    const { error } = await supabase
      .from('course_prerequisites')
      .insert({ course_id: courseId, required_course_id: requiredCourseId })
    if (error) {
      // Unique violation: the edge already exists — report it plainly
      // instead of leaking the raw Postgres message.
      if (error.code === '23505') return { error: 'This prerequisite is already set.' }
      return { error: error.message }
    }
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath('/dashboard/training')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Admin: drop a prerequisite edge.
export async function removePrerequisite(
  courseId: string,
  requiredCourseId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('course_prerequisites')
      .delete()
      .eq('course_id', courseId)
      .eq('required_course_id', requiredCourseId)
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath('/dashboard/training')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Any authenticated user: the courses `courseId` requires, with titles.
export async function fetchPrerequisites(
  courseId: string,
): Promise<ActionResult<PrerequisiteCourse[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data, error } = await supabase
      .from('course_prerequisites')
      .select('required_course_id, required:courses!course_prerequisites_required_course_id_fkey(id, title)')
      .eq('course_id', courseId)
    if (error) return { error: error.message }
    const rows = (data ?? []) as unknown as {
      required_course_id: string
      required: { id: string; title: string } | null
    }[]
    return {
      data: rows
        .filter(r => r.required)
        .map(r => ({ id: r.required!.id, title: r.required!.title })),
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Admin: courses that can be picked as a prerequisite for `courseId`
// (non-deleted, not itself, not already a prerequisite of it).
export async function fetchAvailablePrerequisiteCourses(
  courseId: string,
): Promise<ActionResult<PrerequisiteCourse[]>> {
  try {
    const { supabase } = await requireAdmin()
    const [{ data: courses }, { data: existing }] = await Promise.all([
      supabase
        .from('courses')
        .select('id, title')
        .is('deleted_at', null)
        .neq('id', courseId)
        .order('title', { ascending: true }),
      supabase
        .from('course_prerequisites')
        .select('required_course_id')
        .eq('course_id', courseId),
    ])
    const already = new Set((existing ?? []).map(r => r.required_course_id as string))
    return {
      data: ((courses ?? []) as PrerequisiteCourse[])
        .filter(c => !already.has(c.id)),
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Session user: lock state for every published, non-deleted course. A
// course is locked when any of its prerequisites is not complete for the
// user ("complete" = lib/training-progress.ts isCourseComplete). Admins
// viewing as a student still see their own (session) lock state here — the
// training pages resolve impersonation separately via getEffectiveUser.
export async function fetchTrainingAccess(): Promise<ActionResult<TrainingAccess[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title')
      .is('deleted_at', null)
      .eq('status', 'published')
    if (error) return { error: error.message }
    const courseList = (courses ?? []) as { id: string; title: string }[]
    if (courseList.length === 0) return { data: [] }
    const titleById = new Map(courseList.map(c => [c.id, c.title]))

    const { data: edges, error: edgesError } = await supabase
      .from('course_prerequisites')
      .select('course_id, required_course_id')
      .in('course_id', courseList.map(c => c.id))
    if (edgesError) return { error: edgesError.message }

    // Titles of required courses that are themselves unpublished/deleted
    // are not in titleById — fetch them so a locked course still names
    // what is missing.
    const requiredIds = Array.from(new Set((edges ?? []).map(e => e.required_course_id as string)))
    const missingTitleIds = requiredIds.filter(id => !titleById.has(id))
    if (missingTitleIds.length > 0) {
      const { data: reqCourses } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', missingTitleIds)
      for (const c of (reqCourses ?? []) as { id: string; title: string }[]) {
        titleById.set(c.id, c.title)
      }
    }

    const prereqsByCourse = new Map<string, string[]>()
    for (const e of (edges ?? []) as { course_id: string; required_course_id: string }[]) {
      prereqsByCourse.set(e.course_id, [...(prereqsByCourse.get(e.course_id) ?? []), e.required_course_id])
    }

    const access: TrainingAccess[] = []
    for (const course of courseList) {
      const prereqIds = prereqsByCourse.get(course.id) ?? []
      const missing: PrerequisiteCourse[] = []
      for (const prereqId of prereqIds) {
        const complete = await isCourseComplete(user.id, prereqId, supabase)
        if (!complete) {
          missing.push({ id: prereqId, title: titleById.get(prereqId) ?? 'Unknown course' })
        }
      }
      access.push({ course_id: course.id, locked: missing.length > 0, missing })
    }
    return { data: access }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

