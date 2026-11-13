'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

// ─── Certificates on course completion (audit §3 #1) ────────────────────────
// Types are defined locally in this file (shared types/index.ts is not
// edited — other agents are working in parallel).

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  code: string
  issued_at: string
  created_at: string
  course_title: string | null
}

export interface AdminCertificate extends Certificate {
  holder_name: string | null
  holder_email: string | null
}

export interface PublicCertificate {
  holder_name: string
  course_title: string
  issued_at: string
}

export interface CertificateFilters {
  userId?: string
  courseId?: string
}

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

// Code format: 'ACD-' + 8 characters from an unambiguous uppercase
// alphabet (no 0/O, 1/I), drawn from crypto.randomBytes. Uppercase-only
// keeps verification case-insensitive for the user.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  const bytes = randomBytes(8)
  let suffix = ''
  for (let i = 0; i < bytes.length; i++) suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return `ACD-${suffix}`
}

// ─── Single progress definition ────────────────────────────────────────────
// Mirrors the course page (app/dashboard/training/[courseId]/page.tsx) and
// the badge completion check in lib/actions/lessons.ts markLessonComplete:
// a course is complete when EVERY published, non-deleted lesson of the
// course is complete for the user AND every required KB review is done —
// i.e. every published, non-deleted FAQ / script / objection of the
// course's tool has a kb_reviews row for the user. A course with no lessons
// and no required reads is never complete (the course page shows 0% for it).
async function isCourseComplete(
  sb: ReturnType<typeof getServiceClient>,
  userId: string,
  courseId: string
): Promise<boolean> {
  const { data: course } = await sb
    .from('courses')
    .select('id, tool_id')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!course) return false

  // Published, non-deleted lessons of this course (via modules).
  const { data: courseLessons } = await sb
    .from('lessons')
    .select('id, modules!inner(course_id)')
    .is('deleted_at', null)
    .eq('status', 'published')
    .eq('modules.course_id', courseId)
  const lessonIds = (courseLessons ?? []).map(l => l.id)

  // Required KB reads: published, non-deleted FAQs / scripts / objections
  // of the course's tool (same denominator as the course page's
  // requiredReads; drafts are not required reading, B33).
  let requiredReadIds: string[] = []
  const toolId = (course as { tool_id: string | null }).tool_id
  if (toolId) {
    const [faqsRes, scriptsRes, objectionsRes] = await Promise.all([
      sb.from('faqs').select('id').is('deleted_at', null).eq('status', 'published').eq('tool_id', toolId),
      sb.from('scripts').select('id').is('deleted_at', null).eq('status', 'published').eq('tool_id', toolId),
      sb.from('objections').select('id').is('deleted_at', null).eq('status', 'published').eq('tool_id', toolId),
    ])
    requiredReadIds = [
      ...((faqsRes.data ?? []).map(f => f.id)),
      ...((scriptsRes.data ?? []).map(s => s.id)),
      ...((objectionsRes.data ?? []).map(o => o.id)),
    ]
  }

  const totalItems = lessonIds.length + requiredReadIds.length
  if (totalItems === 0) return false

  const { data: progress } = await sb
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000'])
  const completedIds = new Set((progress ?? []).map(p => p.lesson_id))
  if (!lessonIds.every(id => completedIds.has(id))) return false

  if (requiredReadIds.length > 0) {
    const { data: reviews } = await sb
      .from('kb_reviews')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', requiredReadIds)
    const reviewedIds = new Set((reviews ?? []).map(r => r.content_id))
    if (!requiredReadIds.every(id => reviewedIds.has(id))) return false
  }

  return true
}

type CertificateRow = {
  id: string
  user_id: string
  course_id: string
  code: string
  issued_at: string
  created_at: string
  course: { title: string } | null
}

function toCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    user_id: row.user_id,
    course_id: row.course_id,
    code: row.code,
    issued_at: row.issued_at,
    created_at: row.created_at,
    course_title: row.course?.title ?? null,
  }
}

// Issue a certificate if (and only if) the user has completed the course.
// Idempotent: returns the existing certificate when one already exists.
// Returns { data: null } when the course is not (yet) complete.
// Called fire-and-forget from markLessonComplete — it must never throw.
export async function issueCertificateIfComplete(
  userId: string,
  courseId: string
): Promise<ActionResult<Certificate | null>> {
  try {
    const sb = getServiceClient()

    const { data: existing } = await sb
      .from('certificates')
      .select('*, course:courses(title)')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()
    if (existing) return { data: toCertificate(existing as CertificateRow) }

    const complete = await isCourseComplete(sb, userId, courseId)
    if (!complete) return { data: null }

    // Insert, retrying on code collisions (unique `code` constraint).
    // A race on unique(user_id, course_id) re-fetches the winner's row.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      const { data, error } = await sb
        .from('certificates')
        .insert({ user_id: userId, course_id: courseId, code })
        .select('*, course:courses(title)')
        .single()
      if (!error && data) {
        revalidatePath('/dashboard')
        revalidatePath('/admin/certificates')
        return { data: toCertificate(data as CertificateRow) }
      }
      if (error?.code === '23505') {
        // Unique violation: either the code collided (retry with a new
        // code) or another concurrent call issued this certificate first.
        const { data: raced } = await sb
          .from('certificates')
          .select('*, course:courses(title)')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle()
        if (raced) return { data: toCertificate(raced as CertificateRow) }
        continue
      }
      return { error: error?.message ?? 'Failed to issue certificate' }
    }
    return { error: 'Failed to issue certificate: could not generate a unique code' }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Staff: own certificates, newest first, with the course title.
export async function fetchMyCertificates(): Promise<ActionResult<Certificate[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data, error } = await supabase
      .from('certificates')
      .select('*, course:courses(title)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
    if (error) return { error: error.message }
    return { data: ((data ?? []) as CertificateRow[]).map(toCertificate) }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Admin: all certificates, optionally filtered by user and/or course.
export async function fetchAllCertificates(
  filters: CertificateFilters = {}
): Promise<ActionResult<AdminCertificate[]>> {
  try {
    const { supabase } = await requireAdmin()
    let query = supabase
      .from('certificates')
      .select('*, course:courses(title), holder:profiles!certificates_user_id_fkey(full_name, email)')
      .order('issued_at', { ascending: false })
    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.courseId) query = query.eq('course_id', filters.courseId)
    const { data, error } = await query
    if (error) return { error: error.message }
    const rows = (data ?? []) as (CertificateRow & {
      holder: { full_name: string | null; email: string | null } | null
    })[]
    return {
      data: rows.map(r => ({
        ...toCertificate(r),
        holder_name: r.holder?.full_name ?? null,
        holder_email: r.holder?.email ?? null,
      })),
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// Public verification: no auth. Returns ONLY the holder name, course title
// and issued date — nothing else about the user or the course.
export async function fetchCertificateByCode(
  code: string
): Promise<ActionResult<PublicCertificate | null>> {
  try {
    const sb = getServiceClient()
    const { data, error } = await sb
      .from('certificates')
      .select('issued_at, course:courses(title), holder:profiles!certificates_user_id_fkey(full_name)')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { data: null }
    const row = data as unknown as {
      issued_at: string
      course: { title: string } | null
      holder: { full_name: string | null } | null
    }
    return {
      data: {
        holder_name: row.holder?.full_name ?? 'Unknown',
        course_title: row.course?.title ?? 'Unknown course',
        issued_at: row.issued_at,
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
