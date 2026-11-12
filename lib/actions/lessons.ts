'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import type { ActionResult, Lesson, LessonProgress, Status, Difficulty } from '@/types'

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
  return { supabase }
}

export interface LessonInput {
  title: string
  subtitle?: string
  description?: string
  thumbnail_url?: string
  duration_minutes?: number
  difficulty?: Difficulty
  is_required?: boolean
  status?: Status
}

export async function createLesson(
  moduleId: string,
  courseId: string,
  input: LessonInput
): Promise<ActionResult<Lesson>> {
  try {
    const { supabase } = await requireAdmin()
    const { data: existing } = await supabase
      .from('lessons')
      .select('order_index').is('deleted_at', null)
      .eq('module_id', moduleId)
      .order('order_index', { ascending: false })
      .limit(1)
    const nextIndex = (existing?.[0]?.order_index ?? -1) + 1
    const { data, error } = await supabase
      .from('lessons')
      .insert({ ...input, module_id: moduleId, order_index: nextIndex, status: input.status ?? 'draft' })
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`)
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateLesson(
  lessonId: string,
  moduleId: string,
  courseId: string,
  input: Partial<LessonInput>
): Promise<ActionResult<Lesson>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('lessons')
      .update(input)
      .eq('id', lessonId)
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`)
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteLesson(
  lessonId: string,
  moduleId: string,
  courseId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('lessons').update({ deleted_at: new Date().toISOString() }).eq('id', lessonId)
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function reorderLessons(
  moduleId: string,
  courseId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const updates = orderedIds.map((id, index) =>
      supabase.from('lessons').update({ order_index: index }).eq('id', id)
    )
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) return { error: failed.error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Salesman: mark lesson complete ────────────────────────────────────────

export async function markLessonComplete(
  lessonId: string,
  courseId: string
): Promise<ActionResult<LessonProgress>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Resolve the effective user: while an admin impersonates a student
  // (View as Student), progress must land on the student, not the admin
  // (B77). The lesson_progress INSERT policy only allows
  // user_id = auth.uid(), so an impersonated write must go through the
  // service client, which bypasses RLS; a normal student write keeps
  // using the session client.
  const { userId, isImpersonating } = await getEffectiveUser()
  const writeClient = isImpersonating ? getServiceClient() : supabase

  const { data, error } = await writeClient
    .from('lesson_progress')
    .upsert(
      { user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    )
    .select()
    .single()

  if (error) return { error: error.message }

  // Award badges (fire & forget)
  import('@/lib/actions/badges').then(({ checkAndAwardBadge }) => {
    checkAndAwardBadge(userId, 'first_lesson').catch(() => {})

    // Check if entire course is now complete. Completion is defined the
    // same way as the course page: published, non-deleted lessons only
    // (B38a) — draft lessons must not block the badge.
    supabase
      .from('lessons')
      .select('id, modules!inner(course_id)').is('deleted_at', null)
      .eq('status', 'published')
      .eq('modules.course_id', courseId)
      .then(async ({ data: courseLessons }) => {
        if (!courseLessons?.length) return
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', userId)
          .eq('completed', true)
        const completedIds = new Set((progress ?? []).map(p => p.lesson_id))
        const allDone = courseLessons.every(l => completedIds.has(l.id))
        if (!allDone) return
        checkAndAwardBadge(userId, 'first_course').catch(() => {})

        // five_courses counts COMPLETED courses, not assigned ones (B38b):
        // a course counts when it has at least one published, non-deleted
        // lesson and every such lesson is complete for this user.
        const { data: assigned } = await supabase
          .from('course_assignments')
          .select('course_id')
          .eq('user_id', userId)
        const assignedCourseIds = (assigned ?? []).map(a => a.course_id)
        if (assignedCourseIds.length === 0) return
        const { data: assignedModules } = await supabase
          .from('modules')
          .select('id, course_id')
          .is('deleted_at', null)
          .in('course_id', assignedCourseIds)
        const assignedModuleIds = (assignedModules ?? []).map(m => m.id)
        if (assignedModuleIds.length === 0) return
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('id, module_id')
          .is('deleted_at', null)
          .eq('status', 'published')
          .in('module_id', assignedModuleIds)
        const moduleCourseMap = Object.fromEntries((assignedModules ?? []).map(m => [m.id, m.course_id]))
        const lessonsByCourse = (allLessons ?? []).reduce<Record<string, string[]>>((acc, l) => {
          const cid = moduleCourseMap[l.module_id]
          if (cid) {
            if (!acc[cid]) acc[cid] = []
            acc[cid].push(l.id)
          }
          return acc
        }, {})
        const completedCourses = Object.values(lessonsByCourse).filter(
          ids => ids.length > 0 && ids.every(id => completedIds.has(id))
        ).length
        if (completedCourses >= 5) checkAndAwardBadge(userId, 'five_courses').catch(() => {})
      })
  }).catch(() => {})

  revalidatePath(`/dashboard/training/${courseId}`)
  revalidatePath(`/dashboard/training`)
  return { data }
}

export async function bulkSoftDeleteLessons(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('lessons').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/lessons')
    
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
