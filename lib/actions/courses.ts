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
    const { error } = await supabase.from('courses').delete().eq('id', id)
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
