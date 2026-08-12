'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, SalesScript, ScriptType, Status } from '@/types'

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
      })
      .select()
      .single()
    if (error) return { error: error.message }
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
    const { error } = await supabase.from('scripts').delete().eq('id', id)
    if (error) return { error: error.message }
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
