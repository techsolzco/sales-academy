'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Tool, ToolCategory, Status } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

export interface ToolInput {
  name: string
  logo_url?: string
  description?: string
  website_url?: string
  category?: ToolCategory
  pricing?: string
  best_for?: string
  features?: string[]
  tutorial_link?: string
  youtube_tutorial_link?: string
  tags?: string[]
  knowledge_summary?: string
  status?: Status
}

export async function createTool(input: ToolInput): Promise<ActionResult<Tool>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('tools')
      .insert({
        ...input,
        category: input.category || 'Sales',
        features: input.features || [],
        tags: input.tags || [],
        status: input.status || 'draft',
      })
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/tools')
    revalidatePath('/dashboard/tools')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateTool(id: string, input: Partial<ToolInput>): Promise<ActionResult<Tool>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('tools')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/tools')
    revalidatePath('/dashboard/tools')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteTool(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('tools').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/tools')
    revalidatePath('/dashboard/tools')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function bulkSoftDeleteTools(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('tools').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/tools')
    
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
