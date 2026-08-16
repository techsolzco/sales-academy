'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export interface Policy {
  id: string
  title: string
  content: string
  is_published: boolean
  created_at: string
  updated_at: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

export async function fetchPolicies(publishedOnly = false): Promise<Policy[]> {
  const supabase = await createClient()
  let q = supabase.from('policies').select('*').order('created_at', { ascending: false })
  if (publishedOnly) q = q.eq('is_published', true)
  const { data } = await q
  return data ?? []
}

export async function createPolicy(title: string, content: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('policies').insert({ title, content, is_published: false })
    if (error) throw error
    revalidatePath('/admin/policies')
    revalidatePath('/dashboard/policies')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}

export async function updatePolicy(id: string, title: string, content: string, is_published: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('policies').update({ title, content, is_published, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/policies')
    revalidatePath('/dashboard/policies')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}

export async function deletePolicy(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('policies').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/policies')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}
