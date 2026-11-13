'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types'

/**
 * Login history + new-device alerts (audit §3 #20).
 *
 * `recordLogin` is an INTERNAL helper, not a user-callable action: it is
 * called only from app/auth/callback/route.ts with the user id the server
 * just resolved from the exchanged session. It must never be imported by
 * a client component, and no caller may pass a user id taken from a
 * client-supplied value. All writes go through the service-role client
 * (the table has no INSERT policy for authenticated — see migration 055).
 */

// ─── Local types (defined here; shared types/index.ts is untouched) ────────

export interface LoginHistoryRow {
  id: string
  user_id: string
  signed_in_at: string
  ip_address: string | null
  user_agent: string | null
  is_new_device: boolean
}

export interface LoginHistoryRowWithUser extends LoginHistoryRow {
  profiles: { full_name: string | null; email: string | null } | null
}

export interface FetchLoginHistoryOptions {
  user_id?: string
  limit?: number
  offset?: number
}

export interface LoginHistoryUserOption {
  id: string
  full_name: string | null
  email: string | null
}

/** A device counts as "new" when this user-agent has not signed in within this window. */
const NEW_DEVICE_WINDOW_DAYS = 90

// ─── Auth helpers (requireAdmin copied from lib/actions/lessons.ts) ─────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

// ─── Internal recorder (called from the auth callback route only) ───────────

/**
 * Record one successful sign-in. Determines `is_new_device` by checking
 * whether this user has signed in with the same user-agent in the last
 * 90 days. If it is a new device AND the user is an admin, inserts a bell
 * notification linking to /admin/login-history.
 *
 * Never throws: the callback route calls this fire-and-forget, and a
 * history-recording failure must never fail or delay a login.
 */
export async function recordLogin(
  userId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<ActionResult<{ isNewDevice: boolean }>> {
  try {
    const admin = createAdminClient()

    let isNewDevice = false
    if (userAgent) {
      const windowStart = new Date(
        Date.now() - NEW_DEVICE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString()
      const { data: prior } = await admin
        .from('login_history')
        .select('id')
        .eq('user_id', userId)
        .eq('user_agent', userAgent)
        .gte('signed_in_at', windowStart)
        .limit(1)
      isNewDevice = !prior || prior.length === 0
    }

    const { error } = await admin.from('login_history').insert({
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      is_new_device: isNewDevice,
    })
    if (error) return { error: error.message }

    if (isNewDevice) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.role === 'admin') {
        const { error: notifError } = await admin.from('notifications').insert({
          user_id: userId,
          title: 'New sign-in from a new device',
          body: ip
            ? `Your admin account signed in from a new device (IP ${ip}). If this wasn't you, change your password and review your login history.`
            : `Your admin account signed in from a new device. If this wasn't you, change your password and review your login history.`,
          type: 'system',
          link: '/admin/login-history',
        })
        if (notifError) {
          console.error('[login-history] new-device notification insert failed', notifError.message)
        }
      }
    }

    return { data: { isNewDevice } }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to record login' }
  }
}

// ─── Staff: own history ─────────────────────────────────────────────────────

export async function fetchMyLoginHistory(
  limit = 20,
): Promise<ActionResult<LoginHistoryRow[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Session client + RLS ("Users SELECT own login_history") — the user
    // can only ever read their own rows.
    const { data, error } = await supabase
      .from('login_history')
      .select('id, user_id, signed_in_at, ip_address, user_agent, is_new_device')
      .eq('user_id', user.id)
      .order('signed_in_at', { ascending: false })
      .limit(limit)
    if (error) return { error: error.message }
    return { data: (data ?? []) as LoginHistoryRow[] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch login history' }
  }
}

// ─── Admin: all history + user filter options ───────────────────────────────

export async function fetchLoginHistory(
  options: FetchLoginHistoryOptions = {},
): Promise<ActionResult<LoginHistoryRowWithUser[]>> {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const limit = options.limit ?? 50
    const offset = options.offset ?? 0

    let query = admin
      .from('login_history')
      .select('*, profiles!login_history_user_id_fkey(full_name, email)')
      .order('signed_in_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (options.user_id) {
      query = query.eq('user_id', options.user_id)
    }

    const { data, error } = await query
    if (error) return { error: error.message }
    return { data: (data ?? []) as LoginHistoryRowWithUser[] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch login history' }
  }
}

export async function fetchLoginHistoryUsers(): Promise<ActionResult<LoginHistoryUserOption[]>> {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name', { ascending: true })
    if (error) return { error: error.message }
    return { data: (data ?? []) as LoginHistoryUserOption[] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch users' }
  }
}
