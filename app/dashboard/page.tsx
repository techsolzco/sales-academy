import { createClient } from '@/lib/supabase/server'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { StatCard } from '@/components/ui/StatCard'
import { BookOpen, CheckCircle, Clock, Star } from 'lucide-react'
import { getGreeting } from '@/lib/utils'
import { StudentCourseCard } from '@/components/training/StudentCourseCard'
import { fetchMyRank } from '@/lib/actions/leaderboard'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { SalesTargetCard } from '@/components/targets/SalesTargetCard'
import { StreakCard } from '@/components/streaks/StreakCard'
import { MySalesSummary } from '@/components/sales/MySalesSummary'
import { SalesLogForm } from '@/components/sales/SalesLogForm'
import { MyCertificatesSection } from '@/components/certificates/MyCertificatesSection'

export default async function SalesmanDashboardPage() {
  const supabase = await createClient()
  const { userId, isImpersonating, profile } = await getEffectiveUser()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const greeting = getGreeting()

  // ── B7: real per-user numbers for the effective user ──────────────────────
  // Assigned courses: only published + not soft-deleted ones are counted and
  // listed (a draft/deleted course cannot be opened from the student side, so
  // counting it here would show a number the list below cannot account for).
  const { data: assignments } = await supabase
    .from('course_assignments')
    .select('course_id, due_date')
    .eq('user_id', userId)

  const assignedCourseIds = Array.from(new Set((assignments ?? []).map(a => a.course_id)))
  const dueDateByCourse: Record<string, string | null> = Object.fromEntries(
    (assignments ?? []).map(a => [a.course_id, a.due_date])
  )

  const { data: coursesData } = assignedCourseIds.length > 0
    ? await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, category, difficulty, estimated_duration_minutes, tool_id')
        .is('deleted_at', null)
        .eq('status', 'published')
        .in('id', assignedCourseIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const courses = coursesData ?? []
  const courseIds = courses.map(c => c.id)

  // Progress per course — SAME definition as the course page
  // (app/dashboard/training/[courseId]/page.tsx, pct at lines ~120-126):
  //   pct = (completed lessons + completed required KB reviews)
  //         / (all lessons + all required KB reads)
  // A course counts as completed when pct === 100% (and it has at least one
  // item). Denominators deliberately mirror the course page, including its
  // known quirks (B32: draft/soft-deleted lessons still count; B33: draft KB
  // items still count as required) — fixing those belongs to B32/B33.
  const { data: modules } = courseIds.length > 0
    ? await supabase.from('modules').select('id, course_id, lessons(id)').is('deleted_at', null).in('course_id', courseIds)
    : { data: [] }

  const lessonIdsByCourse: Record<string, string[]> = {}
  const allLessonIds: string[] = []
  for (const m of modules ?? []) {
    const ids = (((m as any).lessons ?? []) as any[]).map(l => l.id as string)
    lessonIdsByCourse[m.course_id] = [...(lessonIdsByCourse[m.course_id] ?? []), ...ids]
    allLessonIds.push(...ids)
  }

  const toolIds = Array.from(new Set(courses.map(c => c.tool_id).filter(Boolean))) as string[]
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
      ? supabase.from('lesson_progress').select('lesson_id').eq('user_id', userId).eq('completed', true).in('lesson_id', allLessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
  ])

  const requiredIdsByCourse: Record<string, string[]> = {}
  for (const item of [...(faqsRes.data ?? []), ...(scriptsRes.data ?? []), ...(objectionsRes.data ?? [])]) {
    for (const course of courses) {
      if (course.tool_id === item.tool_id) {
        requiredIdsByCourse[course.id] = [...(requiredIdsByCourse[course.id] ?? []), item.id]
      }
    }
  }
  const allRequiredIds = Object.values(requiredIdsByCourse).flat()

  const { data: reviews } = allRequiredIds.length > 0
    ? await supabase.from('kb_reviews').select('content_id').eq('user_id', userId).in('content_id', allRequiredIds)
    : { data: [] }

  const completedLessonSet = new Set((progressRes.data ?? []).map(p => p.lesson_id))
  const reviewedSet = new Set((reviews ?? []).map(r => r.content_id))

  const courseProgress = courses.map(course => {
    const lessonIds = lessonIdsByCourse[course.id] ?? []
    const requiredIds = requiredIdsByCourse[course.id] ?? []
    const completedLessons = lessonIds.filter(id => completedLessonSet.has(id)).length
    const completedReviews = requiredIds.filter(id => reviewedSet.has(id)).length
    const totalItems = lessonIds.length + requiredIds.length
    const completedItems = completedLessons + completedReviews
    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    return {
      course,
      lessonCount: lessonIds.length,
      completedCount: completedLessons,
      reviewCount: requiredIds.length,
      completedReviewCount: completedReviews,
      isComplete: pct === 100 && totalItems > 0,
    }
  })

  const assignedCount = courses.length
  const completedCount = courseProgress.filter(p => p.isComplete).length
  const inProgressCount = assignedCount - completedCount

  // Score: the user's leaderboard points. In View-as-Student mode the rank is
  // the impersonated student's — fetchMyRank only honours an explicit userId
  // for admins, and the real session user is an admin in that mode (B26).
  // '—' when the user has no rank yet or the leaderboard is unavailable.
  const myRank = await fetchMyRank(isImpersonating ? userId : undefined)
  const score: number | string = myRank?.entry.score ?? '—'

  return (
    <div className="px-4 py-5 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Ready to level up your sales skills today?
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Assigned Courses"
          value={assignedCount}
          description="Total assigned"
          icon={<BookOpen className="w-5 h-5" />}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          description="Courses finished"
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          description="Currently active"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Your Score"
          value={score}
          description="Overall performance"
          icon={<Star className="w-5 h-5" />}
        />
      </div>

      {/* Assigned courses */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Courses</h2>
      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No courses assigned to you yet. Check back soon — your trainer will assign courses here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {courseProgress.map(p => (
            <StudentCourseCard
              key={p.course.id}
              id={p.course.id}
              title={p.course.title}
              description={p.course.description ?? null}
              thumbnail_url={p.course.thumbnail_url ?? null}
              category={p.course.category ?? null}
              difficulty={p.course.difficulty ?? null}
              lessonCount={p.lessonCount}
              completedCount={p.completedCount}
              reviewCount={p.reviewCount}
              completedReviewCount={p.completedReviewCount}
              durationMinutes={p.course.estimated_duration_minutes ?? null}
              dueDate={dueDateByCourse[p.course.id] ?? null}
            />
          ))}
        </div>
      )}
      {/* My progress: onboarding, streak, sales target */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 mt-8">My Progress</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <OnboardingChecklist />
        <StreakCard />
        <SalesTargetCard />
      </div>

      {/* My sales */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">My Sales</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        <MySalesSummary />
        <SalesLogForm />
      </div>

      {/* My certificates */}
      <MyCertificatesSection />
    </div>
  )
}
