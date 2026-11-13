'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

// ─── Types (local to this file — shared types/index.ts is not edited) ───────

export type AuditLogSource = 'audit_logs' | 'admin_audit_logs'

export interface AuditLogRow {
  id: string
  source: AuditLogSource
  created_at: string
  actor_id: string
  actor_name: string
  action: string
  details: string
  target_id?: string | null
}

export interface FetchAuditLogsParams {
  search?: string
  action?: string
  /** Actor id — matches audit_logs.actor_id / admin_audit_logs.admin_id. */
  user_id?: string
  /** Inclusive lower bound. A bare YYYY-MM-DD date means start of that day. */
  from?: string
  /** Inclusive upper bound. A bare YYYY-MM-DD date means end of that day. */
  to?: string
  limit?: number
  offset?: number
}

export interface FetchAuditLogsResult {
  rows: AuditLogRow[]
  hasMore: boolean
}

export interface AuditLogActor {
  id: string
  full_name: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Escape LIKE wildcards so free-text search is literal, not a pattern.
 *  Commas are also replaced: PostgREST splits .or() filters on commas, so
 *  a literal comma in the search term would corrupt the filter (400). */
function escapeLike(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, ' ')
}

function normaliseDateBound(value: string | undefined, isEnd: boolean): string | undefined {
  if (!value) return undefined
  // Bare date (YYYY-MM-DD) → start / end of that day (UTC).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return isEnd ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`
  }
  return value
}

function formatAuditLogDetails(row: {
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown> | null
}): string {
  const parts: string[] = [row.target_type]
  if (row.target_id) parts.push(row.target_id)
  let details = parts.join(' ')
  if (row.metadata && Object.keys(row.metadata).length > 0) {
    details += ` — ${JSON.stringify(row.metadata)}`
  }
  return details
}

// ─── Fetch: union of both audit tables, newest first, paginated ─────────────

/**
 * Admin-only audit-log viewer (audit §3 #11).
 *
 * Reads BOTH audit tables and unions them newest-first:
 * - `audit_logs` (001): generic immutable log. Columns: id, actor_id,
 *   action, target_type, target_id, metadata (jsonb), created_at.
 *   NOTE: no code in the repo currently writes to this table — it is
 *   populated by direct DB writes / future actions. It is read here so
 *   the viewer shows it the moment rows appear.
 * - `admin_audit_logs` (018): admin actions, written by
 *   `startViewAsStudent` (view-as-student.ts). Columns: id, admin_id,
 *   admin_name (snapshot), action, target_user_id, target_user_name
 *   (snapshot), details (text), created_at.
 *
 * Column mapping to the unified AuditLogRow:
 *   actor_id     ← audit_logs.actor_id / admin_audit_logs.admin_id
 *   actor_name   ← profiles.full_name (lookup by actor id); falls back to
 *                  admin_audit_logs.admin_name when no profile row exists
 *   action       ← action (both tables)
 *   details      ← admin_audit_logs.details verbatim; for audit_logs built
 *                  as "<target_type> <target_id> — <metadata JSON>"
 *   target_id    ← audit_logs.target_id / admin_audit_logs.target_user_id
 *   created_at   ← created_at (both tables)
 *
 * Pagination across the union: each table is fetched with
 * (offset + limit + 1) rows, merged, sorted newest-first, then sliced to
 * [offset, offset + limit). hasMore is true when the merged set holds
 * more rows than the slice — correct because either table alone can
 * supply at most offset + limit + 1 rows, so a combined total above
 * offset + limit always shows up in the merged set.
 */
export async function fetchAuditLogs(
  params: FetchAuditLogsParams = {}
): Promise<ActionResult<FetchAuditLogsResult>> {
  try {
    const { supabase } = await requireAdmin()

    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100)
    const offset = Math.max(params.offset ?? 0, 0)
    const fetchCount = offset + limit + 1

    const search = params.search?.trim() || undefined
    const action = params.action?.trim() || undefined
    const actorId = params.user_id?.trim() || undefined
    const from = normaliseDateBound(params.from?.trim(), false)
    const to = normaliseDateBound(params.to?.trim(), true)

    // ── audit_logs (001) ──
    let auditQ = supabase
      .from('audit_logs')
      .select('id, actor_id, action, target_type, target_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .range(0, fetchCount - 1)
    if (action) auditQ = auditQ.eq('action', action)
    if (actorId) auditQ = auditQ.eq('actor_id', actorId)
    if (from) auditQ = auditQ.gte('created_at', from)
    if (to) auditQ = auditQ.lte('created_at', to)
    if (search) {
      const s = escapeLike(search)
      // metadata is jsonb — not searchable via ilike, so search the
      // text columns only (action, target_type).
      auditQ = auditQ.or(`action.ilike.%${s}%,target_type.ilike.%${s}%`)
    }

    // ── admin_audit_logs (018) ──
    let adminQ = supabase
      .from('admin_audit_logs')
      .select('id, admin_id, admin_name, action, target_user_id, target_user_name, details, created_at')
      .order('created_at', { ascending: false })
      .range(0, fetchCount - 1)
    if (action) adminQ = adminQ.eq('action', action)
    if (actorId) adminQ = adminQ.eq('admin_id', actorId)
    if (from) adminQ = adminQ.gte('created_at', from)
    if (to) adminQ = adminQ.lte('created_at', to)
    if (search) {
      const s = escapeLike(search)
      adminQ = adminQ.or(
        `action.ilike.%${s}%,details.ilike.%${s}%,admin_name.ilike.%${s}%,target_user_name.ilike.%${s}%`
      )
    }

    const [{ data: auditRows, error: auditError }, { data: adminRows, error: adminError }] =
      await Promise.all([auditQ, adminQ])
    if (auditError) return { error: auditError.message }
    if (adminError) return { error: adminError.message }

    // ── Actor names from profiles (single lookup for both tables) ──
    const actorIds = Array.from(
      new Set([
        ...((auditRows ?? []).map((r: { actor_id: string }) => r.actor_id)),
        ...((adminRows ?? []).map((r: { admin_id: string }) => r.admin_id)),
      ])
    )
    const nameById = new Map<string, string>()
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds)
      for (const p of profiles ?? []) nameById.set(p.id, p.full_name ?? 'Unknown')
    }

    const rows: AuditLogRow[] = [
      ...((auditRows ?? []).map((r: {
        id: string
        actor_id: string
        action: string
        target_type: string
        target_id: string | null
        metadata: Record<string, unknown> | null
        created_at: string
      }) => ({
        id: r.id,
        source: 'audit_logs' as AuditLogSource,
        created_at: r.created_at,
        actor_id: r.actor_id,
        actor_name: nameById.get(r.actor_id) ?? 'Unknown',
        action: r.action,
        details: formatAuditLogDetails(r),
        target_id: r.target_id,
      }))),
      ...((adminRows ?? []).map((r: {
        id: string
        admin_id: string
        admin_name: string | null
        action: string
        target_user_id: string | null
        target_user_name: string | null
        details: string | null
        created_at: string
      }) => ({
        id: r.id,
        source: 'admin_audit_logs' as AuditLogSource,
        created_at: r.created_at,
        actor_id: r.admin_id,
        actor_name: nameById.get(r.admin_id) ?? r.admin_name ?? 'Unknown',
        action: r.action,
        details: r.target_user_name
          ? `${r.details ?? ''} → ${r.target_user_name}`.trim()
          : (r.details ?? ''),
        target_id: r.target_user_id,
      }))),
    ]

    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const hasMore = rows.length > offset + limit
    return { data: { rows: rows.slice(offset, offset + limit), hasMore } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ─── Filter options ─────────────────────────────────────────────────────────

/** Distinct action values across both tables, for the action filter dropdown. */
export async function fetchAuditLogActions(): Promise<ActionResult<string[]>> {
  try {
    const { supabase } = await requireAdmin()
    const [{ data: a, error: errA }, { data: b, error: errB }] = await Promise.all([
      supabase.from('audit_logs').select('action').limit(1000),
      supabase.from('admin_audit_logs').select('action').limit(1000),
    ])
    if (errA) return { error: errA.message }
    if (errB) return { error: errB.message }
    const actions = Array.from(
      new Set([...(a ?? []), ...(b ?? [])].map((r: { action: string }) => r.action))
    ).sort()
    return { data: actions }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

/** Distinct actors (admins) who have audit rows, for the actor filter dropdown. */
export async function fetchAuditLogActors(): Promise<ActionResult<AuditLogActor[]>> {
  try {
    const { supabase } = await requireAdmin()
    const [{ data: a, error: errA }, { data: b, error: errB }] = await Promise.all([
      supabase.from('audit_logs').select('actor_id').limit(1000),
      supabase.from('admin_audit_logs').select('admin_id').limit(1000),
    ])
    if (errA) return { error: errA.message }
    if (errB) return { error: errB.message }
    const ids = Array.from(
      new Set([
        ...(a ?? []).map((r: { actor_id: string }) => r.actor_id),
        ...(b ?? []).map((r: { admin_id: string }) => r.admin_id),
      ])
    )
    if (ids.length === 0) return { data: [] }
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ids)
      .order('full_name')
    if (profileError) return { error: profileError.message }
    return {
      data: (profiles ?? []).map((p: { id: string; full_name: string | null }) => ({
        id: p.id,
        full_name: p.full_name ?? 'Unknown',
      })),
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
