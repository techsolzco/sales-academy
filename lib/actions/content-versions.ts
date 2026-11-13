'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

// Content versioning for scripts / FAQs / objections (audit §3 #10).
// Every edit snapshots the previous live row before the update lands, so an
// admin can view the history of an item and restore an earlier version.
// A restore snapshots the CURRENT live row first, so a restore is itself
// reversible. Versions are append-only (no UPDATE policy in the migration).

export type ContentType = 'script' | 'faq' | 'objection'

export interface ContentVersion {
  id: string
  content_type: ContentType
  content_id: string
  snapshot: Record<string, unknown>
  changed_by: string | null
  changed_by_name: string | null
  created_at: string
}

const TABLE_BY_TYPE: Record<ContentType, string> = {
  script: 'scripts',
  faq: 'faqs',
  objection: 'objections',
}

const REVALIDATE_PATHS: Record<ContentType, string[]> = {
  script: ['/admin/scripts', '/dashboard/scripts'],
  faq: ['/admin/faqs', '/dashboard/faqs'],
  objection: ['/admin/objections', '/dashboard/objections'],
}

// Columns that must never be written back from a snapshot: identity and
// lifecycle columns are owned by the live row, not by the version.
const PROTECTED_KEYS = new Set(['id', 'created_at', 'updated_at', 'deleted_at'])

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

/** Save a snapshot of a content row. Called by the update hooks in
 *  scripts.ts / faqs.ts / objections.ts BEFORE the update is applied. */
export async function saveVersion(
  contentType: ContentType,
  contentId: string,
  snapshot: Record<string, unknown>,
  changedBy: string,
): Promise<ActionResult<ContentVersion>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('content_versions')
      .insert({
        content_type: contentType,
        content_id: contentId,
        snapshot,
        changed_by: changedBy,
      })
      .select()
      .single()
    if (error) return { error: error.message }
    return { data: { ...(data as Omit<ContentVersion, 'changed_by_name'>), changed_by_name: null } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

/** Version history for one content item, newest first, with changer names. */
export async function fetchVersions(
  contentType: ContentType,
  contentId: string,
): Promise<ActionResult<ContentVersion[]>> {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('content_versions')
      .select('*')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }

    const rows = (data ?? []) as Array<{
      id: string
      content_type: ContentType
      content_id: string
      snapshot: Record<string, unknown>
      changed_by: string | null
      created_at: string
    }>

    const changerIds = Array.from(new Set(rows.map(r => r.changed_by).filter(Boolean))) as string[]
    const names: Record<string, string> = {}
    if (changerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', changerIds)
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string }>) {
        names[p.id] = p.full_name
      }
    }

    return {
      data: rows.map(r => ({
        ...r,
        changed_by_name: r.changed_by ? (names[r.changed_by] ?? null) : null,
      })),
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

/** Restore a version into the live row. Snapshots the current live row
 *  first, so this restore can itself be undone by restoring that version. */
export async function restoreVersion(versionId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin()

    const { data: version, error: versionError } = await supabase
      .from('content_versions')
      .select('*')
      .eq('id', versionId)
      .single()
    if (versionError || !version) {
      return { error: versionError?.message ?? 'Version not found' }
    }

    const contentType = version.content_type as ContentType
    const table = TABLE_BY_TYPE[contentType]
    if (!table) return { error: `Unknown content type: ${String(version.content_type)}` }

    // Snapshot the CURRENT live row first — the restore stays reversible.
    const { data: current } = await supabase
      .from(table)
      .select('*')
      .eq('id', version.content_id)
      .single()
    if (current) {
      const snap = await saveVersion(contentType, version.content_id, current as Record<string, unknown>, user.id)
      if (snap.error) {
        return { error: `Could not snapshot the current version before restoring: ${snap.error}` }
      }
    }

    const snapshot = (version.snapshot ?? {}) as Record<string, unknown>
    const restorable: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(snapshot)) {
      if (!PROTECTED_KEYS.has(key)) restorable[key] = value
    }

    const { error } = await supabase
      .from(table)
      .update({ ...restorable, updated_at: new Date().toISOString() })
      .eq('id', version.content_id)
    if (error) return { error: error.message }

    for (const path of REVALIDATE_PATHS[contentType]) revalidatePath(path)
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
