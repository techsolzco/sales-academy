'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Lesson, LessonProgress, Status, Difficulty } from '@/types'

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
      .select('order_index')
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
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
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

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(
      { user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    )
    .select()
    .single()

  if (error) return { error: error.message }

  // Award badges (fire & forget)
  import('@/lib/actions/badges').then(({ checkAndAwardBadge }) => {
    checkAndAwardBadge(user.id, 'first_lesson').catch(() => {})

    // Check if entire course is now complete
    supabase
      .from('lessons')
      .select('id, modules!inner(course_id)')
      .eq('modules.course_id', courseId)
      .then(async ({ data: courseLessons }) => {
        if (!courseLessons?.length) return
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('completed', true)
        const completedIds = new Set((progress ?? []).map(p => p.lesson_id))
        const allDone = courseLessons.every(l => completedIds.has(l.id))
        if (allDone) {
          checkAndAwardBadge(user.id, 'first_course').catch(() => {})
          // Check 5 courses
          const { count } = await supabase
            .from('course_assignments')
            .select('course_id', { count: 'exact', head: true })
            .eq('user_id', user.id)
          if ((count ?? 0) >= 5) checkAndAwardBadge(user.id, 'five_courses').catch(() => {})
        }
      })
  }).catch(() => {})

  revalidatePath(`/dashboard/training/${courseId}`)
  revalidatePath(`/dashboard/training`)
  return { data }
}
