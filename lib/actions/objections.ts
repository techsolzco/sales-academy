'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Objection, Difficulty, Status } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

export interface ObjectionInput {
  objection_text: string
  meaning?: string
  recommended_response: string
  alternative_response?: string
  do_not_say?: string
  related_product?: string
  related_lesson_id?: string
  difficulty?: Difficulty
  status?: Status
  tool_id?: string | null
}

export async function createObjection(input: ObjectionInput): Promise<ActionResult<Objection>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('objections')
      .insert({
        ...input,
        status: input.status || 'draft',
        tool_id: input.tool_id || null,
      })
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/objections')
    revalidatePath('/dashboard/objections')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function updateObjection(id: string, input: Partial<ObjectionInput>): Promise<ActionResult<Objection>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('objections')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/objections')
    revalidatePath('/dashboard/objections')
    return { data }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function deleteObjection(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('objections').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/objections')
    revalidatePath('/dashboard/objections')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
