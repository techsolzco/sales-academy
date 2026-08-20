'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, FAQ, Status } from '@/types'
import { syncToolKnowledge } from './sync-tool-knowledge'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

export interface FAQInput {
  question: string
  short_answer: string
  detailed_answer?: string
  customer_ready_answer?: string
  category?: string
  tags?: string[]
  priority?: number
  status?: Status
  tool_id?: string | null
}

export async function createFAQ(input: FAQInput): Promise<ActionResult<FAQ>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('faqs')
      .insert({
        ...input,
        category: input.category || 'General',
        tags: input.tags || [],
        priority: input.priority ?? 0,
        status: input.status || 'draft',
        tool_id: input.tool_id || null,
      })
      .select()
      .single()
    if (error) return { error: error.message }
    
    syncToolKnowledge(data.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    
    revalidatePath('/admin/faqs')
    revalidatePath('/dashboard/faqs')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateFAQ(id: string, input: Partial<FAQInput>): Promise<ActionResult<FAQ>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('faqs')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    
    syncToolKnowledge(data.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    
    revalidatePath('/admin/faqs')
    revalidatePath('/dashboard/faqs')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteFAQ(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    
    // Fetch tool_id before deleting
    const { data: existing } = await supabase
      .from('faqs')
      .select('tool_id')
      .eq('id', id)
      .single()
      
    const { error } = await supabase.from('faqs').delete().eq('id', id)
    if (error) return { error: error.message }
    
    if (existing?.tool_id) {
      syncToolKnowledge(existing.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    }
    
    revalidatePath('/admin/faqs')
    revalidatePath('/dashboard/faqs')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
