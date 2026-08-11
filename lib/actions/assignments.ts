'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

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
