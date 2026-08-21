'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Module, Status } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export interface ModuleInput {
  title: string
  description?: string
  duration_minutes?: number
  status?: Status
}

export async function createModule(courseId: string, input: ModuleInput): Promise<ActionResult<Module>> {
  try {
    const { supabase } = await requireAdmin()
    // Get max order_index for this course
    const { data: existing } = await supabase
      .from('modules')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
    const nextIndex = (existing?.[0]?.order_index ?? -1) + 1
    const { data, error } = await supabase
      .from('modules')
      .insert({ ...input, course_id: courseId, order_index: nextIndex, status: input.status ?? 'draft' })
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}`)
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateModule(moduleId: string, courseId: string, input: Partial<ModuleInput>): Promise<ActionResult<Module>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('modules')
      .update(input)
      .eq('id', moduleId)
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`)
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteModule(moduleId: string, courseId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('modules').update({ deleted_at: new Date().toISOString() }).eq('id', moduleId)
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Reorder: receive ordered array of module IDs, update order_index for each
export async function reorderModules(courseId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const updates = orderedIds.map((id, index) =>
      supabase.from('modules').update({ order_index: index }).eq('id', id)
    )
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) return { error: failed.error.message }
    revalidatePath(`/admin/courses/${courseId}`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function bulkSoftDeleteModules(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('modules').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/modules')
    
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
