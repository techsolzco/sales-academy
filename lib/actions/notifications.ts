'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, AppNotification } from '@/types'

/**
 * B8 — WHY A FULL FIX IS NOT POSSIBLE IN THIS FILE ALONE (schema evidence)
 * --------------------------------------------------------------------------
 * supabase/migrations/004_phase4.sql:20-29 defines `notifications` as:
 *   id, user_id (NULLABLE — NULL means broadcast), title, body, type,
 *   link, read (ONE shared boolean), created_at.
 * There is NO `read_by` array/jsonb column, NO `notification_reads`
 * receipts table, and `profiles` has NO `last_notifications_read_at`
 * column (all 30 migrations grepped — profiles only ever gained
 * bio, phone, has_seen_welcome, updated_at). So there is nowhere in the
 * current schema to record "broadcast X was read by user Y".
 *
 * Two things make a naive code-only fix WRONG, so this file deliberately
 * does NOT do them:
 *  1. Flipping the shared `read` flag on a broadcast row would mark it
 *     read for EVERY user at once — one user's click clears it for all.
 *  2. A non-admin cannot UPDATE a broadcast row at all: the RLS policy
 *     "Users UPDATE own notifications" (004_phase4.sql:145-148) only
 *     allows `user_id = auth.uid() OR current_user_role() = 'admin'`,
 *     and NULL never equals auth.uid().
 *
 * What this file DOES do (pragmatic, honest):
 *  - Own (user_id = target) rows are marked read in the DB as before.
 *  - Broadcast rows are NEVER flipped in the DB. markRead() reports
 *    `{ broadcast: true }` and markAllRead() returns the ids of the
 *    still-unread broadcasts, so the caller (NotificationBell) can
 *    record the per-user read state device-locally (localStorage) until
 *    the migration lands. The UI dot then clears on that device; the
 *    DB still says unread, and the migration SQL needed for a real fix
 *    is documented in the worker report.
 *  - fetchUnreadCount() still counts unread broadcasts server-side and
 *    therefore can still be > 0 after a successful mark-all-read until
 *    the migration lands. Callers must NOT drive the red dot from it
 *    alone (see NotificationBell).
 *
 * B59 — every function below accepts an optional `effectiveUserId`.
 * When an admin is impersonating a student (View-as-Student), the
 * dashboard layout passes the EFFECTIVE (student) id — the same id it
 * gives the bell — so list / count / mark-read all act on the student,
 * not on the admin's own rows. A non-admin passing someone else's id
 * fails closed to their own id (see resolveTargetUser).
 */

export interface FetchNotificationsOptions {
  limit?: number
  offset?: number
}

export type MarkReadResult = ActionResult<{ broadcast?: boolean }>
export type MarkAllReadResult = ActionResult<{ broadcastUnreadIds: string[] }>

async function resolveTargetUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, targetUserId: null as string | null }
  return { supabase, user, targetUserId: user.id as string }
}

/**
 * Resolve which user's notifications an action should act on.
 * `effectiveUserId` is the id the dashboard layout already computed
 * (real user, or the impersonated student). It is only honoured when
 * it differs from the session user AND the session user is an admin;
 * otherwise we fail closed to the session user's own id, so a salesman
 * cannot read/mark another user's notifications by passing an id.
 */
async function resolveTargetUserId(effectiveUserId?: string) {
  const { supabase, user, targetUserId } = await resolveTargetUser()
  if (!user || !targetUserId) return { supabase, targetUserId: null as string | null }
  if (!effectiveUserId || effectiveUserId === user.id) return { supabase, targetUserId }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role === 'admin') return { supabase, targetUserId: effectiveUserId }
  return { supabase, targetUserId }
}

export async function fetchUnreadCount(effectiveUserId?: string): Promise<number> {
  const { supabase, targetUserId } = await resolveTargetUserId(effectiveUserId)
  if (!targetUserId) return 0

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)
    .or(`user_id.eq.${targetUserId},user_id.is.null`)

  return count ?? 0
}

export async function fetchNotifications(
  effectiveUserId?: string,
  options?: FetchNotificationsOptions,
): Promise<AppNotification[]> {
  const { supabase, targetUserId } = await resolveTargetUserId(effectiveUserId)
  if (!targetUserId) return []

  // B56 — pagination. Defaults preserve the old behaviour (first 20)
  // so existing callers keep working; the bell passes offset/limit.
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${targetUserId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return data ?? []
}

export async function markRead(id: string, effectiveUserId?: string): Promise<MarkReadResult> {
  const { supabase, targetUserId } = await resolveTargetUserId(effectiveUserId)
  if (!targetUserId) return { error: 'Unauthorized' }

  // B58 — distinguish own rows from broadcasts instead of silently
  // "succeeding" on 0 affected rows (the old .eq('user_id', user.id)
  // update matched nothing for broadcast rows and returned no error).
  const { data: row } = await supabase
    .from('notifications')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (!row) return { error: 'Notification not found' }
  if (row.user_id !== null && row.user_id !== targetUserId) {
    return { error: 'Not your notification' }
  }

  // B8 — broadcast rows have no per-user read state in the schema (see
  // header). Do NOT flip the shared `read` flag: report it so the
  // caller records the read device-locally until the migration lands.
  if (row.user_id === null) {
    return { data: { broadcast: true } }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', targetUserId)

  if (error) return { error: error.message }
  return { data: {} }
}

export async function markAllRead(effectiveUserId?: string): Promise<MarkAllReadResult> {
  const { supabase, targetUserId } = await resolveTargetUserId(effectiveUserId)
  if (!targetUserId) return { error: 'Unauthorized' }

  // Own rows: mark read in the DB (this part works).
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', targetUserId)
    .eq('read', false)

  if (error) return { error: error.message }

  // B8 — broadcast rows: do NOT update the shared `read` flag (it would
  // clear them for every user, and RLS blocks non-admins anyway).
  // Return their ids so the caller can record them read per-user
  // (device-local until the notification_reads migration lands).
  const { data: unreadBroadcasts } = await supabase
    .from('notifications')
    .select('id')
    .is('user_id', null)
    .eq('read', false)

  revalidatePath('/', 'layout')
  return { data: { broadcastUnreadIds: (unreadBroadcasts ?? []).map((n) => n.id as string) } }
}
