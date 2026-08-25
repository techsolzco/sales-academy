'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, SalesScript, ScriptType, Status } from '@/types'
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

export interface ScriptInput {
  title: string
  script_type: ScriptType
  language?: string
  content: string
  when_to_use?: string
  related_product?: string
  related_objection?: string
  tags?: string[]
  status?: Status
  tool_id?: string | null
}

export async function createScript(input: ScriptInput): Promise<ActionResult<SalesScript>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('scripts')
      .insert({
        ...input,
        language: input.language || 'English',
        tags: input.tags || [],
        status: input.status || 'draft',
        tool_id: input.tool_id || null,
      })
      .select()
      .single()
    if (error) return { error: error.message }
    
    syncToolKnowledge(data.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    
    revalidatePath('/admin/scripts')
    revalidatePath('/dashboard/scripts')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateScript(id: string, input: Partial<ScriptInput>): Promise<ActionResult<SalesScript>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('scripts')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    
    syncToolKnowledge(data.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    
    revalidatePath('/admin/scripts')
    revalidatePath('/dashboard/scripts')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteScript(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    
    const { data: existing } = await supabase
      .from('scripts')
      .select('tool_id').is('deleted_at', null)
      .eq('id', id)
      .single()
      
    const { error } = await supabase.from('scripts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) return { error: error.message }
    
    if (existing?.tool_id) {
      syncToolKnowledge(existing.tool_id).catch(e => console.warn('Knowledge sync error:', e))
    }
    
    revalidatePath('/admin/scripts')
    revalidatePath('/dashboard/scripts')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function logScriptCopy(scriptId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
      .from('script_copies')
      .insert({ user_id: user.id, script_id: scriptId })

    if (error) return { error: error.message }

    // Award first_script_copy badge (fire & forget)
    import('@/lib/actions/badges').then(({ checkAndAwardBadge }) => {
      checkAndAwardBadge(user.id, 'first_script_copy').catch(() => {})
    }).catch(() => {})

    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function bulkSoftDeleteScripts(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('scripts').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/scripts')
    
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
export async function bulkPublishScripts(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: existing } = await supabase.from('scripts').select('tool_id').in('id', ids).is('deleted_at', null);
    const { error } = await supabase.from('scripts').update({ status: 'published' }).in('id', ids);
    if (error) return { error: error.message };
    if (existing) {
      const toolIds = Array.from(new Set(existing.map(e => e.tool_id).filter(Boolean)));
      toolIds.forEach(id => {
        if (id) syncToolKnowledge(id).catch(e => console.warn('Knowledge sync error:', e));
      });
    }
    revalidatePath('/admin/scripts');
    revalidatePath('/dashboard/scripts');
    return { data: undefined };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}
