'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

export type TrashedContentType = 'courses' | 'faqs' | 'scripts' | 'objections' | 'voice_notes' | 'assignments' | 'quizzes' | 'tools'

export interface TrashedItem {
  id: string
  label: string
  type: TrashedContentType
  deleted_at: string
}

export async function fetchTrashedItems(): Promise<Record<TrashedContentType, TrashedItem[]>> {
  await requireAdmin()
  const sb = getServiceClient()

  const [courses, faqs, scripts, objections, voice_notes, assignments, quizzes, tools] = await Promise.all([
    sb.from('courses').select('id, title, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    sb.from('faqs').select('id, question, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    sb.from('scripts').select('id, title, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    sb.from('objections').select('id, objection_text, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    sb.from('voice_notes').select('id, title, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    sb.from('assignments').select('id, title, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    sb.from('quizzes').select('id, title, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    sb.from('tools').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
  ])

  return {
    courses: (courses.data ?? []).map(r => ({ id: r.id, label: r.title, type: 'courses', deleted_at: r.deleted_at })),
    faqs: (faqs.data ?? []).map(r => ({ id: r.id, label: r.question, type: 'faqs', deleted_at: r.deleted_at })),
    scripts: (scripts.data ?? []).map(r => ({ id: r.id, label: r.title, type: 'scripts', deleted_at: r.deleted_at })),
    objections: (objections.data ?? []).map(r => ({ id: r.id, label: r.objection_text, type: 'objections', deleted_at: r.deleted_at })),
    voice_notes: (voice_notes.data ?? []).map(r => ({ id: r.id, label: r.title, type: 'voice_notes', deleted_at: r.deleted_at })),
    assignments: (assignments.data ?? []).map(r => ({ id: r.id, label: r.title, type: 'assignments', deleted_at: r.deleted_at })),
    quizzes: (quizzes.data ?? []).map(r => ({ id: r.id, label: r.title, type: 'quizzes', deleted_at: r.deleted_at })),
    tools: (tools.data ?? []).map(r => ({ id: r.id, label: r.name, type: 'tools', deleted_at: r.deleted_at })),
  }
}

export async function restoreItem(type: TrashedContentType, id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const sb = getServiceClient()
    const { error } = await sb.from(type).update({ deleted_at: null }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/settings/recycle-bin')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function permanentlyDelete(type: TrashedContentType, id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const sb = getServiceClient()
    const { error } = await sb.from(type).delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/settings/recycle-bin')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
