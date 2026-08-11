'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, ContentBlock, ContentBlockType } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

const defaultContent: Record<ContentBlockType, Record<string, unknown>> = {
  text:    { body: '' },
  heading: { text: '', level: 2 },
  image:   { url: '', alt: '', caption: '' },
  youtube: { videoId: '', title: '' },
  pdf:     { url: '', filename: '' },
  link:    { url: '', label: '', description: '' },
  quote:   { text: '', author: '' },
  callout: { variant: 'info', title: '', body: '' },
}

export async function createContentBlock(
  lessonId: string,
  courseId: string,
  moduleId: string,
  type: ContentBlockType
): Promise<ActionResult<ContentBlock>> {
  try {
    const { supabase } = await requireAdmin()
    const { data: existing } = await supabase
      .from('content_blocks')
      .select('order_index')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: false })
      .limit(1)
    const nextIndex = (existing?.[0]?.order_index ?? -1) + 1
    const { data, error } = await supabase
      .from('content_blocks')
      .insert({ lesson_id: lessonId, type, content: defaultContent[type], order_index: nextIndex })
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateContentBlock(
  blockId: string,
  lessonId: string,
  courseId: string,
  moduleId: string,
  content: Record<string, unknown>
): Promise<ActionResult<ContentBlock>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('content_blocks')
      .update({ content })
      .eq('id', blockId)
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteContentBlock(
  blockId: string,
  lessonId: string,
  courseId: string,
  moduleId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('content_blocks').delete().eq('id', blockId)
    if (error) return { error: error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function reorderContentBlocks(
  lessonId: string,
  courseId: string,
  moduleId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const updates = orderedIds.map((id, index) =>
      supabase.from('content_blocks').update({ order_index: index }).eq('id', id)
    )
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) return { error: failed.error.message }
    revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
