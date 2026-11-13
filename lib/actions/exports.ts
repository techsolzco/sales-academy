'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'
import { fetchLeaderboard } from '@/lib/actions/leaderboard'
import { fetchTeamMembers } from '@/lib/actions/users'
import { fetchSalesReport } from '@/lib/actions/sales'
import { fetchAllQuizzes } from '@/lib/actions/quizzes'

// ─── CSV export for reports / users / leaderboard (audit §3 #15, MEDIUM) ────
// Admin-only. Each export reuses the existing fetch function for its data
// (fetchTeamMembers, fetchLeaderboard, fetchAllQuizzes, fetchSalesReport)
// and serialises the returned rows to CSV server-side — no new queries
// against those tables. The one exception is quiz RESULTS: no existing
// fetch returns per-attempt rows (fetchAllQuizzes returns only per-quiz
// counts, fetchQuizStats only aggregates), so exportQuizResultsCsv reads
// quiz_attempts (joined to quizzes/profiles for titles/names) directly;
// fetchAllQuizzes is still used to validate the optional quizId and to
// resolve quiz titles.
//
// Types are defined locally in this file (shared types/index.ts is not
// edited). Every export checks the session first via requireAdmin() — the
// same pattern as lib/actions/lessons.ts.

export interface CsvExportResult {
  filename: string
  csv: string
}

export interface QuizResultRow {
  quiz_title: string
  user_name: string
  score: number
  max_score: number
  percentage: number
  passed: boolean
  completed_at: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

// ─── CSV building ───────────────────────────────────────────────────────────
// RFC 4180 escaping: wrap a field in double quotes when it contains a comma,
// quote or newline, and double any inner quotes. Header row included.
// Lines end \r\n. A UTF-8 BOM is prepended so Excel opens non-ASCII names
// correctly instead of mojibake.

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"'
  return text
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ]
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(Math.round(value * 10) / 10)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'quiz'
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function exportUsersCsv(): Promise<ActionResult<CsvExportResult>> {
  try {
    await requireAdmin()
    const members = await fetchTeamMembers()
    // NOTE: fetchTeamMembers currently selects id, full_name, email,
    // avatar_url, status, created_at, phone, role — it does NOT select
    // `whatsapp` (profiles.whatsapp exists since migration 014). The
    // whatsapp column is emitted below and read defensively, so it stays
    // empty until that select adds `whatsapp`; no column is invented and
    // no second profiles query is run here.
    const rows = (members as any[]).map((m) => [
      m.full_name ?? '',
      m.email ?? '',
      m.phone ?? '',
      m.whatsapp ?? '',
      m.role ?? '',
      m.status ?? '',
      m.created_at ?? '',
    ])
    return {
      data: {
        filename: `users-${dateStamp()}.csv`,
        csv: buildCsv(
          ['full_name', 'email', 'phone', 'whatsapp', 'role', 'status', 'created_at'],
          rows
        ),
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Leaderboard ────────────────────────────────────────────────────────────

export async function exportLeaderboardCsv(): Promise<ActionResult<CsvExportResult>> {
  try {
    await requireAdmin()
    const result = await fetchLeaderboard()
    if (result.error || !result.data) {
      return { error: result.error ?? 'Leaderboard returned no data' }
    }
    const rows = result.data.map((entry) => [
      entry.rank,
      entry.full_name ?? '',
      entry.courses_completed,
      entry.lessons_completed,
      entry.scripts_copied,
      entry.score,
    ])
    return {
      data: {
        filename: `leaderboard-${dateStamp()}.csv`,
        csv: buildCsv(
          ['rank', 'full_name', 'courses_completed', 'lessons_completed', 'scripts_copied', 'score'],
          rows
        ),
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Quiz results ───────────────────────────────────────────────────────────
// quizId optional: a single quiz's attempts, or every quiz's attempts when
// omitted. Rows are one per attempt (not per user — a user with several
// attempts appears once per attempt, newest first).

export async function exportQuizResultsCsv(
  quizId?: string
): Promise<ActionResult<CsvExportResult>> {
  try {
    const { supabase } = await requireAdmin()

    const quizzes = await fetchAllQuizzes()
    const titleById = new Map(quizzes.map((q) => [q.id, q.title]))
    let filenameSuffix = 'all-quizzes'
    if (quizId) {
      const title = titleById.get(quizId)
      if (!title) return { error: 'Quiz not found' }
      filenameSuffix = slugify(title)
    }

    let query = supabase
      .from('quiz_attempts')
      .select('*, quizzes ( title ), profiles ( full_name )')
      .order('completed_at', { ascending: false })
    if (quizId) query = query.eq('quiz_id', quizId)

    const { data, error } = await query
    if (error) return { error: error.message }

    const rows = ((data ?? []) as any[]).map((attempt) => [
      (attempt.quizzes as any)?.title ?? titleById.get(attempt.quiz_id) ?? '',
      (attempt.profiles as any)?.full_name ?? 'Unknown',
      attempt.score,
      attempt.max_score,
      formatPercentage(attempt.percentage),
      attempt.passed ? 'Yes' : 'No',
      attempt.completed_at ?? '',
    ])
    return {
      data: {
        filename: `quiz-results-${filenameSuffix}-${dateStamp()}.csv`,
        csv: buildCsv(
          ['quiz_title', 'user_name', 'score', 'max_score', 'percentage', 'passed', 'completed_at'],
          rows
        ),
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ── Sales ──────────────────────────────────────────────────────────────────

export async function exportSalesCsv(filters?: {
  from?: string
  to?: string
}): Promise<ActionResult<CsvExportResult>> {
  try {
    await requireAdmin()
    // fetchSalesReport validates the date range itself (YYYY-MM-DD, from <=
    // to) and returns { error } on bad input — surfaced unchanged here.
    const result = await fetchSalesReport({ from: filters?.from, to: filters?.to })
    if (result.error || !result.data) {
      return { error: result.error ?? 'Sales report returned no data' }
    }
    const rows = result.data.sales.map((sale) => [
      sale.sale_date ?? '',
      sale.full_name ?? 'Unknown',
      sale.product_name ?? '',
      sale.bundle_name ?? '',
      sale.amount_pkr,
      sale.customer_ref ?? '',
      sale.notes ?? '',
      sale.created_at ?? '',
    ])
    const suffix =
      filters?.from || filters?.to
        ? `-${filters.from ?? 'start'}-to-${filters.to ?? 'end'}`
        : ''
    return {
      data: {
        filename: `sales${suffix}-${dateStamp()}.csv`,
        csv: buildCsv(
          ['sale_date', 'salesman', 'product_name', 'bundle_name', 'amount_pkr', 'customer_ref', 'notes', 'created_at'],
          rows
        ),
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
