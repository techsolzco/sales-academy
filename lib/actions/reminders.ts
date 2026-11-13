'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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

// ─── Local types (audit §3 #5 / #7) ─────────────────────────────────────────

export interface ReminderTarget {
  kind: 'assignment' | 'meeting'
  item_id: string
  item_title: string
  user_id: string
  full_name: string | null
  whatsapp: string | null
  /** ISO timestamp the item is due / scheduled. */
  due_at: string
  /** Short Hinglish message, built server-side. */
  message: string
  /** Ready wa.me link, or null when the intern has no WhatsApp number. */
  whatsapp_url: string | null
}

export interface ReminderTargets {
  dueAssignments: ReminderTarget[]
  upcomingMeetings: ReminderTarget[]
}

export interface OverdueUser {
  user_id: string
  full_name: string | null
  whatsapp: string | null
  message: string
  whatsapp_url: string | null
}

export interface OverdueAssignmentRow {
  assignment_id: string
  title: string
  due_date: string
  overdue_users: OverdueUser[]
}

export interface DueReminderResult {
  reminded: number
  skipped: number
}

// ─── Assignment scope (mirrors lib/actions/assignments.ts) ──────────────────
// An assignment is in scope for a user when it links to one of their
// assigned courses, tools or lessons — or when it links to nothing at
// all (a general assignment, visible to every salesman). Replicated here
// (not imported) because getAssignmentScope/isAssignmentInScope are not
// exported, and this file must not edit assignments.ts.

interface UserScope {
  courseIds: Set<string>
  toolIds: Set<string>
  lessonIds: Set<string>
}

interface ActiveSalesman {
  id: string
  full_name: string | null
  whatsapp: string | null
}

async function getActiveSalesmen(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ActiveSalesman[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, whatsapp')
    .eq('role', 'salesman')
    .eq('status', 'active')
    .order('full_name', { ascending: true })
  return (data ?? []) as ActiveSalesman[]
}

async function getUserScopes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, UserScope>> {
  const scopes = new Map<string, UserScope>()
  for (const id of userIds) {
    scopes.set(id, { courseIds: new Set(), toolIds: new Set(), lessonIds: new Set() })
  }
  if (userIds.length === 0) return scopes

  const { data: assigned } = await supabase
    .from('course_assignments')
    .select('course_id, user_id')
    .in('user_id', userIds)
  // (No Set spread: tsconfig defaults to ES5, so [...new Set(...)] fails tsc.)
  const courseIds = ((assigned ?? []) as any[]).map(a => a.course_id as string)
    .filter((v, i, a) => a.indexOf(v) === i)
  for (const row of (assigned ?? []) as any[]) {
    scopes.get(row.user_id as string)?.courseIds.add(row.course_id as string)
  }
  if (courseIds.length === 0) return scopes

  const { data: courses } = await supabase
    .from('courses')
    .select('id, tool_id')
    .in('id', courseIds)
  const courseToTool = new Map<string, string>()
  for (const c of (courses ?? []) as any[]) {
    if (c.tool_id) courseToTool.set(c.id as string, c.tool_id as string)
  }
  // tsconfig has no "target" (defaults to ES5): iterate Sets/Maps with
  // forEach, never for...of.
  scopes.forEach((scope) => {
    scope.courseIds.forEach((courseId) => {
      const toolId = courseToTool.get(courseId)
      if (toolId) scope.toolIds.add(toolId)
    })
  })

  const { data: modules } = await supabase
    .from('modules')
    .select('id, course_id')
    .is('deleted_at', null)
    .in('course_id', courseIds)
  const moduleIds = ((modules ?? []) as any[]).map(m => m.id as string)
  const moduleToCourse = new Map<string, string>()
  for (const m of (modules ?? []) as any[]) {
    moduleToCourse.set(m.id as string, m.course_id as string)
  }
  if (moduleIds.length === 0) return scopes

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, module_id')
    .is('deleted_at', null)
    .in('module_id', moduleIds)
  for (const l of (lessons ?? []) as any[]) {
    const courseId = moduleToCourse.get(l.module_id as string)
    if (!courseId) continue
    scopes.forEach((scope) => {
      if (scope.courseIds.has(courseId)) scope.lessonIds.add(l.id as string)
    })
  }
  return scopes
}

function isInScope(
  assignment: { course_id?: string | null; tool_id?: string | null; lesson_id?: string | null },
  scope: UserScope,
): boolean {
  if (!assignment.course_id && !assignment.tool_id && !assignment.lesson_id) return true
  if (assignment.course_id && scope.courseIds.has(assignment.course_id)) return true
  if (assignment.tool_id && scope.toolIds.has(assignment.tool_id)) return true
  if (assignment.lesson_id && scope.lessonIds.has(assignment.lesson_id)) return true
  return false
}

/** Set of "assignment_id:user_id" pairs that already have a submission. */
async function getSubmittedPairs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentIds: string[],
): Promise<Set<string>> {
  if (assignmentIds.length === 0) return new Set()
  const { data } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, user_id')
    .in('assignment_id', assignmentIds)
  return new Set(((data ?? []) as any[]).map(s => `${s.assignment_id as string}:${s.user_id as string}`))
}

// ─── Message text (short Hinglish, built server-side) ───────────────────────

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

function assignmentMessage(name: string | null, title: string, dueDate: string): string {
  const firstName = (name ?? '').trim().split(' ')[0] || 'Salam'
  return `Salam ${firstName}! Reminder: "${title}" assignment ki due date ${formatDueDate(dueDate)} hai. Please time par submit kar dein. — Sheraz Academy`
}

function meetingMessage(name: string | null, title: string, scheduledAt: string): string {
  const firstName = (name ?? '').trim().split(' ')[0] || 'Salam'
  return `Salam ${firstName}! "${title}" meeting ${formatMeetingTime(scheduledAt)} par hai. Please time par join kar lein. — Sheraz Academy`
}

function overdueMessage(name: string | null, title: string, dueDate: string): string {
  const firstName = (name ?? '').trim().split(' ')[0] || 'Salam'
  return `Salam ${firstName}! "${title}" assignment ki due date ${formatDueDate(dueDate)} guzar chuki hai. Please jald az jald submit kar dein. — Sheraz Academy`
}

// ─── #5 — WhatsApp reminder nudges ──────────────────────────────────────────

/**
 * Admin only. Returns every intern who still owes work, with a ready
 * wa.me nudge per row:
 *  (a) assignments due within the next 7 days, users in scope who have
 *      not submitted;
 *  (b) meetings scheduled in the next 48h, with their invitees.
 * No WhatsApp API sender exists — the admin taps the link (see
 * components/admin/ReminderButton.tsx).
 */
export async function fetchReminderTargets(): Promise<ActionResult<ReminderTargets>> {
  try {
    const { supabase } = await requireAdmin()
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    const nowIso = now.toISOString()

    const salesmen = await getActiveSalesmen(supabase)
    const scopes = await getUserScopes(supabase, salesmen.map(s => s.id))

    // (a) Due assignments — next 7 days.
    const { data: assignments, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, title, due_date, course_id, tool_id, lesson_id')
      .is('deleted_at', null)
      .not('due_date', 'is', null)
      .gt('due_date', nowIso)
      .lte('due_date', in7Days)
      .order('due_date', { ascending: true })
    if (assignmentError) return { error: assignmentError.message }

    const assignmentRows = (assignments ?? []) as any[]
    const submitted = await getSubmittedPairs(supabase, assignmentRows.map(a => a.id as string))

    const dueAssignments: ReminderTarget[] = []
    for (const a of assignmentRows) {
      for (const user of salesmen) {
        const scope = scopes.get(user.id)
        if (!scope || !isInScope(a, scope)) continue
        if (submitted.has(`${a.id as string}:${user.id}`)) continue
        const message = assignmentMessage(user.full_name, a.title as string, a.due_date as string)
        dueAssignments.push({
          kind: 'assignment',
          item_id: a.id as string,
          item_title: a.title as string,
          user_id: user.id,
          full_name: user.full_name,
          whatsapp: user.whatsapp,
          due_at: a.due_date as string,
          message,
          whatsapp_url: buildWhatsAppUrl(user.whatsapp, message),
        })
      }
    }

    // (b) Upcoming meetings — next 48h. meeting_invitees is the source of
    // truth for both visibilities: public meetings invite every active
    // salesman at creation (see createMeeting), invited meetings only
    // their list.
    const serviceClient = getServiceClient()
    const { data: meetings, error: meetingError } = await serviceClient
      .from('meetings')
      .select('id, title, scheduled_at')
      .gt('scheduled_at', nowIso)
      .lte('scheduled_at', in48h)
      .order('scheduled_at', { ascending: true })
    if (meetingError) return { error: meetingError.message }

    const meetingRows = (meetings ?? []) as any[]
    const upcomingMeetings: ReminderTarget[] = []
    if (meetingRows.length > 0) {
      const meetingIds = meetingRows.map(m => m.id as string)
      const { data: inviteeRows } = await serviceClient
        .from('meeting_invitees')
        .select('meeting_id, user_id, profile:profiles(id, full_name, whatsapp)')
        .in('meeting_id', meetingIds)
      const meetingById = new Map(meetingRows.map(m => [m.id as string, m]))
      for (const row of (inviteeRows ?? []) as any[]) {
        const meeting = meetingById.get(row.meeting_id as string)
        if (!meeting) continue
        const profile = row.profile ?? {}
        const message = meetingMessage(
          profile.full_name ?? null,
          meeting.title as string,
          meeting.scheduled_at as string,
        )
        upcomingMeetings.push({
          kind: 'meeting',
          item_id: meeting.id as string,
          item_title: meeting.title as string,
          user_id: row.user_id as string,
          full_name: profile.full_name ?? null,
          whatsapp: profile.whatsapp ?? null,
          due_at: meeting.scheduled_at as string,
          message,
          whatsapp_url: buildWhatsAppUrl(profile.whatsapp ?? null, message),
        })
      }
    }

    return { data: { dueAssignments, upcomingMeetings } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ─── #7 — Due-date reminders + overdue escalation ────────────────────────────

// Dedupe key for sendDueReminders: the exact link only this function
// writes for a user (reviewSubmission writes '/dashboard/assignments'
// with no id; submitAssignment writes '/admin/assignments/<id>' rows
// for admins). Combined with user_id + created_at within the last 24h
// it is a reliable dedupe, so NO new table / migration 047 is needed.
const DUE_REMINDER_LINK = (assignmentId: string) => `/dashboard/assignments/${assignmentId}`

/**
 * Admin only. For every assignment due within the next 24h, inserts a
 * bell notification for each in-scope user who has not submitted —
 * unless that user already got a reminder for the same assignment in
 * the last 24h (dedupe via the notifications table, see above).
 * Intended to be triggered by the button on /admin/reminders now, and
 * by a cron later. Returns { reminded, skipped }.
 */
export async function sendDueReminders(): Promise<ActionResult<DueReminderResult>> {
  try {
    const { supabase } = await requireAdmin()
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const nowIso = now.toISOString()
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const salesmen = await getActiveSalesmen(supabase)
    const scopes = await getUserScopes(supabase, salesmen.map(s => s.id))

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('id, title, due_date, course_id, tool_id, lesson_id')
      .is('deleted_at', null)
      .not('due_date', 'is', null)
      .gt('due_date', nowIso)
      .lte('due_date', in24h)
      .order('due_date', { ascending: true })
    if (error) return { error: error.message }

    const assignmentRows = (assignments ?? []) as any[]
    if (assignmentRows.length === 0) return { data: { reminded: 0, skipped: 0 } }

    const submitted = await getSubmittedPairs(supabase, assignmentRows.map(a => a.id as string))
    const serviceClient = getServiceClient()

    let reminded = 0
    let skipped = 0
    const notifs: { user_id: string; title: string; body: string; type: string; link: string }[] = []

    for (const a of assignmentRows) {
      const link = DUE_REMINDER_LINK(a.id as string)
      // Users already reminded for this assignment in the last 24h.
      const { data: recent } = await serviceClient
        .from('notifications')
        .select('user_id')
        .eq('link', link)
        .gte('created_at', windowStart)
      const alreadyReminded = new Set(((recent ?? []) as any[]).map(r => r.user_id as string))

      for (const user of salesmen) {
        const scope = scopes.get(user.id)
        if (!scope || !isInScope(a, scope)) continue
        if (submitted.has(`${a.id as string}:${user.id}`)) continue
        if (alreadyReminded.has(user.id)) {
          skipped += 1
          continue
        }
        notifs.push({
          user_id: user.id,
          title: `Assignment due soon: ${a.title as string}`,
          body: `Your assignment "${a.title as string}" is due on ${formatDueDate(a.due_date as string)}. Please submit it before the deadline.`,
          type: 'system',
          link,
        })
        reminded += 1
      }
    }

    if (notifs.length > 0) {
      const { error: insertError } = await serviceClient.from('notifications').insert(notifs)
      if (insertError) return { error: insertError.message }
    }

    revalidatePath('/admin/reminders')
    revalidatePath('/dashboard/assignments')
    return { data: { reminded, skipped } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

/**
 * Admin only. Assignments past their due_date, each with the in-scope
 * users who still have not submitted (with WhatsApp numbers so the
 * admin can nudge them from the Overdue section). Assignments where
 * everybody submitted are omitted.
 */
export async function fetchOverdueAssignments(): Promise<ActionResult<OverdueAssignmentRow[]>> {
  try {
    const { supabase } = await requireAdmin()
    const nowIso = new Date().toISOString()

    const salesmen = await getActiveSalesmen(supabase)
    const scopes = await getUserScopes(supabase, salesmen.map(s => s.id))

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('id, title, due_date, course_id, tool_id, lesson_id')
      .is('deleted_at', null)
      .not('due_date', 'is', null)
      .lt('due_date', nowIso)
      .order('due_date', { ascending: true })
    if (error) return { error: error.message }

    const assignmentRows = (assignments ?? []) as any[]
    const submitted = await getSubmittedPairs(supabase, assignmentRows.map(a => a.id as string))

    const rows: OverdueAssignmentRow[] = []
    for (const a of assignmentRows) {
      const overdue_users: OverdueUser[] = []
      for (const user of salesmen) {
        const scope = scopes.get(user.id)
        if (!scope || !isInScope(a, scope)) continue
        if (submitted.has(`${a.id as string}:${user.id}`)) continue
        const message = overdueMessage(user.full_name, a.title as string, a.due_date as string)
        overdue_users.push({
          user_id: user.id,
          full_name: user.full_name,
          whatsapp: user.whatsapp,
          message,
          whatsapp_url: buildWhatsAppUrl(user.whatsapp, message),
        })
      }
      if (overdue_users.length > 0) {
        rows.push({
          assignment_id: a.id as string,
          title: a.title as string,
          due_date: a.due_date as string,
          overdue_users,
        })
      }
    }

    return { data: rows }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
