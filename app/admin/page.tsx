import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/ui/StatCard'
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  // ── B6: real stat queries (were hardcoded "—") ───────────────────────────
  // Conventions follow the other admin pages (e.g. app/admin/layout.tsx,
  // app/admin/courses/[id]/assign/page.tsx): the session (anon) client, and
  // `.select('id', { count: 'exact', head: true })` for counts. Admin role is
  // enforced by app/admin/layout.tsx.
  // Total Salesmen: profiles has no deleted flag — "active" is status='active'.
  const [{ count: totalSalesmen }, { count: publishedCourses }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'salesman').eq('status', 'active'),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null),
  ])

  // ── Completion Rate + Courses Completed ───────────────────────────────────
  // PROGRESS DEFINITION — identical to the course page
  // (app/dashboard/training/[courseId]/page.tsx, pct at lines ~120-126):
  //   pct = (completed lessons + completed required KB reviews)
  //         / (all lessons + all required KB reads)
  // A course counts as completed when pct === 100% (and the course has at
  // least one item). Required reads are the non-deleted faqs/scripts/
  // objections linked to the course's tool_id. This deliberately mirrors the
  // course page's denominators — including its known quirks (B32: draft /
  // soft-deleted lessons still count in the denominator; B33: draft KB items
  // still count as required). Fixing those denominators belongs to B32/B33;
  // changing them here alone would make the admin rate disagree with what a
  // student sees on the course page.
  // Only assignments whose course is published + not soft-deleted are counted
  // (a draft/deleted course cannot be completed from the student side).
  const [{ data: assignments }, { data: assignedCourses }] = await Promise.all([
    supabase.from('course_assignments').select('course_id, user_id'),
    supabase.from('courses').select('id, tool_id, modules(id, lessons(id))').is('deleted_at', null).eq('status', 'published'),
  ])

  const courseMap = new Map((assignedCourses ?? []).map(c => [c.id, c]))
  const assignedPairs = (assignments ?? []).filter(a => courseMap.has(a.course_id))

  const lessonIdsByCourse = new Map<string, string[]>()
  const allLessonIds: string[] = []
  for (const course of assignedCourses ?? []) {
    const lessonIds = ((course as any).modules ?? []).flatMap((m: any) => ((m.lessons ?? []) as any[]).map(l => l.id as string))
    lessonIdsByCourse.set(course.id, lessonIds)
    allLessonIds.push(...lessonIds)
  }

  const toolIds = Array.from(new Set((assignedCourses ?? []).map(c => c.tool_id).filter(Boolean))) as string[]
  const [faqsRes, scriptsRes, objectionsRes, progressRes] = await Promise.all([
    toolIds.length > 0
      ? supabase.from('faqs').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds)
      : Promise.resolve({ data: [] as { id: string; tool_id: string }[] }),
    toolIds.length > 0
      ? supabase.from('scripts').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds)
      : Promise.resolve({ data: [] as { id: string; tool_id: string }[] }),
    toolIds.length > 0
      ? supabase.from('objections').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds)
      : Promise.resolve({ data: [] as { id: string; tool_id: string }[] }),
    allLessonIds.length > 0
      ? supabase.from('lesson_progress').select('lesson_id, user_id').eq('completed', true).in('lesson_id', allLessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string; user_id: string }[] }),
  ])

  const requiredIdsByCourse = new Map<string, string[]>()
  for (const item of [...(faqsRes.data ?? []), ...(scriptsRes.data ?? []), ...(objectionsRes.data ?? [])]) {
    for (const course of assignedCourses ?? []) {
      if (course.tool_id === item.tool_id) {
        requiredIdsByCourse.set(course.id, [...(requiredIdsByCourse.get(course.id) ?? []), item.id])
      }
    }
  }
  const allRequiredIds = Array.from(requiredIdsByCourse.values()).flat()

  const { data: reviewRows } = allRequiredIds.length > 0
    ? await supabase.from('kb_reviews').select('content_id, user_id').in('content_id', allRequiredIds)
    : { data: [] }

  const completedLessonSet = new Set((progressRes.data ?? []).map(p => `${p.user_id}:${p.lesson_id}`))
  const reviewedSet = new Set((reviewRows ?? []).map(r => `${r.user_id}:${r.content_id}`))

  let completedPairs = 0
  for (const a of assignedPairs) {
    const lessonIds = lessonIdsByCourse.get(a.course_id) ?? []
    const requiredIds = requiredIdsByCourse.get(a.course_id) ?? []
    const total = lessonIds.length + requiredIds.length
    if (total === 0) continue
    const done =
      lessonIds.filter(id => completedLessonSet.has(`${a.user_id}:${id}`)).length +
      requiredIds.filter(id => reviewedSet.has(`${a.user_id}:${id}`)).length
    if (done === total) completedPairs++
  }

  const completionRate = assignedPairs.length > 0
    ? Math.round((completedPairs / assignedPairs.length) * 100)
    : 0

  return (
    <div className="px-4 py-5 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Admin'} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Here&apos;s what&apos;s happening across your academy today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Salesmen"
          value={totalSalesmen ?? 0}
          description="Active learners"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Published Courses"
          value={publishedCourses ?? 0}
          description="Available to team"
          icon={<BookOpen className="w-5 h-5" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          description="Of assigned courses"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        {/* B6 — honest choice: there is NO certificates table in the repo, so
            no certification count exists to show. This card instead shows the
            count of completed assigned courses (same completed-pairs count as
            the Completion Rate above) and is labelled accordingly — it is not
            called "Certifications". */}
        <StatCard
          title="Courses Completed"
          value={completedPairs}
          description="All learners, all time"
          icon={<Award className="w-5 h-5" />}
        />
      </div>

      {/* Placeholder content area */}
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-12 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Content panels will appear here in the next phase.
        </p>
      </div>
    </div>
  )
}
