'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { fetchMySales, fetchSalesReport } from '@/lib/actions/sales'

// ─── Sales targets + progress (audit §3 #13, MEDIUM) ───────────────────────
// Types are defined locally in this file (shared types/index.ts is not
// edited). Every action checks the session first: admin actions require
// profiles.role = 'admin' — the same requireAdmin() pattern as
// lib/actions/lessons.ts. Achieved amounts are always read through
// fetchMySales / fetchSalesReport (lib/actions/sales.ts), never by querying
// sales_records directly: if migration 044 (sales_records) has not been
// applied yet, those calls fail and achieved degrades to 0 instead of
// throwing. Likewise, if this migration (051) is not applied yet,
// fetchMyTarget degrades to "no target" rather than erroring.

export interface SalesTarget {
  id: string
  user_id: string
  month: string
  target_amount: number
  created_by: string | null
  created_at: string
  full_name?: string
}

export interface MyTargetResult {
  month: string
  target_amount: number
  has_target: boolean
  achieved: number
  progress_pct: number
}

export interface TargetProgressRow {
  user_id: string
  full_name: string
  month: string
  target_amount: number
  achieved: number
  progress_pct: number
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function monthBounds(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

function progressPct(achieved: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((achieved / target) * 100))
}

// ── Admin: set (or update) a user's monthly target ─────────────────────────

export async function setSalesTarget(
  userId: string,
  month: string,
  amount: number
): Promise<ActionResult<SalesTarget>> {
  try {
    const { supabase, user } = await requireAdmin()

    if (!userId) return { error: 'User id is required' }
    if (!isValidMonth(month)) return { error: 'Month must be in YYYY-MM format' }
    if (!Number.isInteger(amount) || amount <= 0) {
      return { error: 'Target amount must be a positive whole number of PKR' }
    }

    const { data, error } = await supabase
      .from('sales_targets')
      .upsert(
        { user_id: userId, month, target_amount: amount, created_by: user.id },
        { onConflict: 'user_id,month' }
      )
      .select()
      .single()
    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/admin/reports/sales')
    return { data: data as SalesTarget }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Staff: my target for a month + progress against my sales ───────────────

export async function fetchMyTarget(
  month?: string
): Promise<ActionResult<MyTargetResult>> {
  try {
    const { supabase, user } = await requireAuth()

    const targetMonth = month ?? currentMonth()
    if (!isValidMonth(targetMonth)) return { error: 'Month must be in YYYY-MM format' }

    // Achieved: degrade to 0 if the sales table / migration 044 is not
    // applied yet (fetchMySales returns { error } instead of throwing).
    const salesResult = await fetchMySales(targetMonth)
    const achieved = salesResult.error || !salesResult.data ? 0 : salesResult.data.monthly_total

    // Target: degrade to "no target" if this migration (051) is not applied
    // yet, instead of erroring the whole widget.
    const { data, error } = await supabase
      .from('sales_targets')
      .select('target_amount')
      .eq('user_id', user.id)
      .eq('month', targetMonth)
      .maybeSingle()
    if (error) {
      return {
        data: {
          month: targetMonth,
          target_amount: 0,
          has_target: false,
          achieved,
          progress_pct: 0,
        },
      }
    }

    const targetAmount = data?.target_amount ?? 0
    return {
      data: {
        month: targetMonth,
        target_amount: targetAmount,
        has_target: targetAmount > 0,
        achieved,
        progress_pct: progressPct(achieved, targetAmount),
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Admin: every user's target + achieved for a month ──────────────────────

export async function fetchTargetsForMonth(
  month: string
): Promise<ActionResult<TargetProgressRow[]>> {
  try {
    const { supabase } = await requireAdmin()

    if (!isValidMonth(month)) return { error: 'Month must be in YYYY-MM format' }

    const { data, error } = await supabase
      .from('sales_targets')
      // sales_targets has TWO FKs to profiles (user_id + created_by), so the
      // embed must name the FK explicitly — an unqualified `profiles (...)`
      // fails live with "Could not embed because more than one relationship
      // was found for 'sales_targets' and 'profiles'" (seen 2026-11-13).
      .select('user_id, month, target_amount, profiles!sales_targets_user_id_fkey ( full_name )')
      .eq('month', month)
      .order('target_amount', { ascending: false })
    if (error) return { error: error.message }

    // Achieved per user via the admin sales report (month window). If the
    // sales table is not applied yet, every achieved degrades to 0.
    const achievedByUser = new Map<string, number>()
    const { from, to } = monthBounds(month)
    const report = await fetchSalesReport({ from, to })
    if (!report.error && report.data) {
      for (const total of report.data.totals) {
        achievedByUser.set(total.user_id, total.total_amount)
      }
    }

    const rows: TargetProgressRow[] = ((data ?? []) as any[]).map(row => {
      const achieved = achievedByUser.get(row.user_id) ?? 0
      return {
        user_id: row.user_id,
        full_name: row.profiles?.full_name ?? 'Unknown',
        month: row.month,
        target_amount: row.target_amount,
        achieved,
        progress_pct: progressPct(achieved, row.target_amount),
      }
    })
    return { data: rows }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
