import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exportUsersCsv,
  exportLeaderboardCsv,
  exportQuizResultsCsv,
  exportSalesCsv,
} from '@/lib/actions/exports'

// ─── CSV download route (audit §3 #15, MEDIUM) ──────────────────────────────
// GET /api/export?type=users|leaderboard|quiz-results|sales
//   &quizId=<id>   (quiz-results only; omitted = all quizzes)
//   &from=YYYY-MM-DD&to=YYYY-MM-DD  (sales only; both optional)
// Admin-only: unauthenticated callers get 401, non-admins 403 — checked
// explicitly here with the session client + profile role (S14: never rely
// on the middleware redirect). The export actions re-check admin
// themselves as defence in depth.

const EXPORT_TYPES = ['users', 'leaderboard', 'quiz-results', 'sales'] as const
type ExportType = (typeof EXPORT_TYPES)[number]

async function requireAdmin(): Promise<
  { user: { id: string } } | { response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response

  const params = req.nextUrl.searchParams
  const type = params.get('type') as ExportType | null
  if (!type || !EXPORT_TYPES.includes(type)) {
    return NextResponse.json(
      { error: 'Invalid export type. Expected one of: users, leaderboard, quiz-results, sales.' },
      { status: 400 }
    )
  }

  const quizId = params.get('quizId') || undefined
  const from = params.get('from') || undefined
  const to = params.get('to') || undefined

  const result =
    type === 'users'
      ? await exportUsersCsv()
      : type === 'leaderboard'
        ? await exportLeaderboardCsv()
        : type === 'quiz-results'
          ? await exportQuizResultsCsv(quizId)
          : await exportSalesCsv({ from, to })

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? 'Export failed' },
      { status: 400 }
    )
  }

  const { filename, csv } = result.data
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // Quoted filename: generated server-side from a slug/date, but quoted
      // anyway so a quiz title can never break the header.
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
