import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Single shared definition of "course complete" ─────────────────────────
// A course is complete for a user when EVERY published, non-deleted lesson
// of the course is complete for the user AND every required KB review is
// done — i.e. every published, non-deleted FAQ / script / objection of the
// course's tool has a kb_reviews row for the user. A course with no lessons
// and no required reads is never complete (the course page shows 0% for it).
//
// This is the SAME definition as the course page
// (app/dashboard/training/[courseId]/page.tsx) and the badge completion
// check in lib/actions/lessons.ts markLessonComplete. NOTE:
// lib/actions/certificates.ts still carries its own private copy of this
// logic — it should migrate to this helper in a follow-up (do not duplicate
// the definition a third time).
//
// `sb` is optional: callers that already hold a client (e.g. a service-role
// client in certificates.ts, or the session client in a server action) pass
// it in; otherwise a session client is created. With the session client the
// reads are scoped by RLS to the caller's own lesson_progress / kb_reviews
// rows, so only pass another user's id when using a privileged client.
export async function isCourseComplete(
  userId: string,
  courseId: string,
  sb?: SupabaseClient
): Promise<boolean> {
  const client = sb ?? (await createClient())

  const { data: course } = await client
    .from('courses')
    .select('id, tool_id')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!course) return false

  // Published, non-deleted lessons of this course (via modules).
  const { data: courseLessons } = await client
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
      client.from('faqs').select('id').is('deleted_at', null).eq('status', 'published').eq('tool_id', toolId),
      client.from('scripts').select('id').is('deleted_at', null).eq('status', 'published').eq('tool_id', toolId),
      client.from('objections').select('id').is('deleted_at', null).eq('status', 'published').eq('tool_id', toolId),
    ])
    requiredReadIds = [
      ...((faqsRes.data ?? []).map(f => f.id)),
      ...((scriptsRes.data ?? []).map(s => s.id)),
      ...((objectionsRes.data ?? []).map(o => o.id)),
    ]
  }

  const totalItems = lessonIds.length + requiredReadIds.length
  if (totalItems === 0) return false

  const { data: progress } = await client
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000'])
  const completedIds = new Set((progress ?? []).map(p => p.lesson_id))
  if (!lessonIds.every(id => completedIds.has(id))) return false

  if (requiredReadIds.length > 0) {
    const { data: reviews } = await client
      .from('kb_reviews')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', requiredReadIds)
    const reviewedIds = new Set((reviews ?? []).map(r => r.content_id))
    if (!requiredReadIds.every(id => reviewedIds.has(id))) return false
  }

  return true
}
