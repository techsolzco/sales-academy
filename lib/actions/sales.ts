'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

// ─── Sales performance log (audit §3 #2, HIGH) ─────────────────────────────
// Types are defined locally in this file (shared types/index.ts is not
// edited). Every action checks the session first: staff actions always
// write/read with user_id = the session user (a client-supplied user_id is
// never trusted); admin actions require profiles.role = 'admin' — the same
// requireAdmin() pattern as lib/actions/lessons.ts.

export interface SalesRecord {
  id: string
  user_id: string
  product_name: string
  bundle_name: string | null
  amount_pkr: number
  customer_ref: string | null
  sale_date: string
  notes: string | null
  created_at: string
  full_name?: string
}

export interface SalesLogInput {
  product_name: string
  bundle_name?: string
  amount_pkr: number
  customer_ref?: string
  sale_date: string
  notes?: string
}

export interface InternSalesTotal {
  user_id: string
  full_name: string
  total_amount: number
  sale_count: number
}

export interface MySalesResult {
  sales: SalesRecord[]
  monthly_total: number
  sale_count: number
}

export interface SalesReportResult {
  totals: InternSalesTotal[]
  grand_total: number
  grand_count: number
  sales: SalesRecord[]
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

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === value
}

function isValidMonth(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false
  return true
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Staff: log a sale ─────────────────────────────────────────────────────

export async function logSale(input: SalesLogInput): Promise<ActionResult<SalesRecord>> {
  try {
    const { supabase, user } = await requireAuth()

    const productName = input.product_name?.trim()
    if (!productName) return { error: 'Product name is required' }
    if (!Number.isInteger(input.amount_pkr) || input.amount_pkr <= 0) {
      return { error: 'Amount must be a positive whole number of PKR' }
    }
    if (!isValidDateString(input.sale_date)) {
      return { error: 'Sale date is not a valid date' }
    }
    if (input.sale_date > todayString()) {
      return { error: 'Sale date cannot be in the future' }
    }

    const { data, error } = await supabase
      .from('sales_records')
      .insert({
        user_id: user.id,
        product_name: productName,
        bundle_name: input.bundle_name?.trim() || null,
        amount_pkr: input.amount_pkr,
        customer_ref: input.customer_ref?.trim() || null,
        sale_date: input.sale_date,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single()
    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/admin/reports/sales')
    return { data: data as SalesRecord }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Staff: my own sales (newest first) + monthly total ───────────────────

export async function fetchMySales(month?: string): Promise<ActionResult<MySalesResult>> {
  try {
    const { supabase, user } = await requireAuth()

    let query = supabase
      .from('sales_records')
      .select('*')
      .eq('user_id', user.id)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (month) {
      if (!isValidMonth(month)) return { error: 'Month must be in YYYY-MM format' }
      const [year, m] = month.split('-').map(Number)
      const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`
      query = query.gte('sale_date', `${month}-01`).lt('sale_date', nextMonth)
    }

    const { data, error } = await query
    if (error) return { error: error.message }

    const sales = (data ?? []) as SalesRecord[]
    return {
      data: {
        sales,
        monthly_total: sales.reduce((sum, s) => sum + s.amount_pkr, 0),
        sale_count: sales.length,
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Admin: per-intern totals + grand totals + matching rows ───────────────

export async function fetchSalesReport(filters?: {
  from?: string
  to?: string
  user_id?: string
}): Promise<ActionResult<SalesReportResult>> {
  try {
    const { supabase } = await requireAdmin()

    if (filters?.from && !isValidDateString(filters.from)) {
      return { error: 'From date is not a valid date' }
    }
    if (filters?.to && !isValidDateString(filters.to)) {
      return { error: 'To date is not a valid date' }
    }
    if (filters?.from && filters?.to && filters.from > filters.to) {
      return { error: 'From date must be on or before To date' }
    }

    let query = supabase
      .from('sales_records')
      .select('*, profiles ( full_name )')
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.from) query = query.gte('sale_date', filters.from)
    if (filters?.to) query = query.lte('sale_date', filters.to)
    if (filters?.user_id) query = query.eq('user_id', filters.user_id)

    const { data, error } = await query
    if (error) return { error: error.message }

    const sales: SalesRecord[] = ((data ?? []) as any[]).map(row => ({
      ...(row as SalesRecord),
      full_name: (row.profiles as any)?.full_name ?? 'Unknown',
    }))

    const totalsMap = new Map<string, InternSalesTotal>()
    for (const sale of sales) {
      const existing = totalsMap.get(sale.user_id)
      if (existing) {
        existing.total_amount += sale.amount_pkr
        existing.sale_count += 1
      } else {
        totalsMap.set(sale.user_id, {
          user_id: sale.user_id,
          full_name: sale.full_name ?? 'Unknown',
          total_amount: sale.amount_pkr,
          sale_count: 1,
        })
      }
    }
    const totals = Array.from(totalsMap.values()).sort((a, b) => b.total_amount - a.total_amount)

    return {
      data: {
        totals,
        grand_total: sales.reduce((sum, s) => sum + s.amount_pkr, 0),
        grand_count: sales.length,
        sales,
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Any authenticated user: sales leaderboard (totals only) ────────────────
// Deliberately returns NO customer_ref / notes — those stay private to the
// intern who logged the sale and to admins (fetchSalesReport).

export async function fetchSalesLeaderboard(): Promise<ActionResult<InternSalesTotal[]>> {
  try {
    const { supabase } = await requireAuth()

    const { data, error } = await supabase
      .from('sales_records')
      .select('user_id, amount_pkr, profiles ( full_name )')
    if (error) return { error: error.message }

    const totalsMap = new Map<string, InternSalesTotal>()
    for (const row of (data ?? []) as any[]) {
      const existing = totalsMap.get(row.user_id)
      if (existing) {
        existing.total_amount += row.amount_pkr
        existing.sale_count += 1
      } else {
        totalsMap.set(row.user_id, {
          user_id: row.user_id,
          full_name: row.profiles?.full_name ?? 'Unknown',
          total_amount: row.amount_pkr,
          sale_count: 1,
        })
      }
    }
    const totals = Array.from(totalsMap.values()).sort((a, b) => b.total_amount - a.total_amount)
    return { data: totals }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
