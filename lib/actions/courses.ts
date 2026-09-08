'use server'

import { createClient } from '@/lib/supabase/server'
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
    const { error } = await supabase.from('courses').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) return { error: error.message }
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

