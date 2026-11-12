import { createClient } from '@/lib/supabase/server'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { BookOpen } from 'lucide-react'
import { getGreeting } from '@/lib/utils'
import { StudentCourseCard } from '@/components/training/StudentCourseCard'
import { TrainingTabs } from '@/components/training/TrainingTabs'
import { SalesmanScriptViewer } from '@/components/training/SalesmanScriptViewer'
import { SalesmanObjectionViewer } from '@/components/training/SalesmanObjectionViewer'
import { SalesmanFAQViewer } from '@/components/training/SalesmanFAQViewer'

const SCRIPT_TYPE_ORDER: Record<string, number> = {
  greeting: 1,
  upsell: 2,
  voice_note_script: 3,
  warranty_explanation: 4,
  payment: 5,
  after_sales: 6,
  objection_response: 7,
  follow_up: 8,
  closing: 9,
  cross_sell: 10,
  review_request: 11,
  whatsapp: 12,
}

function scriptTypePriority(type: string): number {
  return SCRIPT_TYPE_ORDER[type] ?? 99
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const supabase = await createClient()
  const { userId, profile } = await getEffectiveUser()

  // 1. Fetch ALL published courses (visible to logged-in salesmen)
  // "Google Ai + Canva" has been set to draft, so only published courses (Reel Bundle) return
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail_url, category, difficulty, estimated_duration_minutes, tool_id')
    .is('deleted_at', null)
    .eq('status', 'published')
    .order('created_at', { ascending: true })

  const courses = coursesData ?? []
  const courseIds = courses.map(c => c.id)
  const toolIds = Array.from(new Set(courses.map(c => c.tool_id).filter(Boolean))) as string[]

  // 2. Fetch course assignments, modules, and lessons for courses
  const [{ data: assignments }, { data: modules }] = await Promise.all([
    supabase
      .from('course_assignments')
      .select('course_id, assigned_at, due_date')
      .eq('user_id', userId),
    courseIds.length > 0
      ? supabase.from('modules').select('id, course_id').is('deleted_at', null).in('course_id', courseIds)
      : { data: [] }
  ])

  const moduleIds = (modules ?? []).map(m => m.id)
  const { data: lessons } = moduleIds.length > 0
    ? await supabase.from('lessons').select('id, module_id, status').is('deleted_at', null).in('module_id', moduleIds)
    : { data: [] }

  const moduleCoursMap = Object.fromEntries((modules ?? []).map(m => [m.id, m.course_id]))
  const lessonsByCourse = (lessons ?? []).reduce<Record<string, string[]>>((acc, l) => {
    const cid = moduleCoursMap[l.module_id]
    // B35: count only published lessons — same denominator as the course page.
    if (cid && (l as any).status === 'published') {
      if (!acc[cid]) acc[cid] = []
      acc[cid].push(l.id)
    }
    return acc
  }, {})

  const lessonIds = (lessons ?? []).map(l => l.id)
  const { data: progress } = lessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
    : { data: [] }

  const completedSet = new Set((progress ?? []).map(p => p.lesson_id))
  const assignmentByCourse = Object.fromEntries((assignments ?? []).map(a => [a.course_id, a]))

  // 3. Parallel fetch: published General items + combined kb_reviews in a single query
  const [
    { data: rawGeneralScripts },
    { data: rawGeneralObjections },
    { data: rawGeneralFaqs },
    { data: reviewsData },
    { data: rawToolScripts },
    { data: rawToolObjections },
    { data: rawToolFaqs },
  ] = await Promise.all([
    supabase
      .from('scripts')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'published')
      .is('tool_id', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('objections')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'published')
      .is('tool_id', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('faqs')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'published')
      .is('tool_id', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('kb_reviews')
      .select('content_type, content_id')
      .eq('user_id', userId),
    // B35: tool-linked KB items for the course cards — same definition as
    // the course page (published, non-deleted; drafts never count as required).
    toolIds.length > 0
      ? supabase.from('scripts').select('id, tool_id').is('deleted_at', null).eq('status', 'published').in('tool_id', toolIds)
      : Promise.resolve({ data: [] as { id: string; tool_id: string }[] }),
    toolIds.length > 0
      ? supabase.from('objections').select('id, tool_id').is('deleted_at', null).eq('status', 'published').in('tool_id', toolIds)
      : Promise.resolve({ data: [] as { id: string; tool_id: string }[] }),
    toolIds.length > 0
      ? supabase.from('faqs').select('id, tool_id').is('deleted_at', null).eq('status', 'published').in('tool_id', toolIds)
      : Promise.resolve({ data: [] as { id: string; tool_id: string }[] }),
  ])

  const reviewedScripts = (reviewsData ?? []).filter(r => r.content_type === 'script').map(r => r.content_id)
  const reviewedObjections = (reviewsData ?? []).filter(r => r.content_type === 'objection').map(r => r.content_id)
  const reviewedFaqs = (reviewsData ?? []).filter(r => r.content_type === 'faq').map(r => r.content_id)

  // B35: per-course required KB reviews — same definition as the course page
  // (published, non-deleted FAQs/Scripts/Objections linked to the course's
  // tool_id). Draft items are shown on the course page but never counted.
  const requiredIdsByCourse = new Map<string, string[]>()
  for (const item of [...(rawToolScripts ?? []), ...(rawToolObjections ?? []), ...(rawToolFaqs ?? [])] as any[]) {
    for (const course of courses) {
      if (course.tool_id && course.tool_id === item.tool_id) {
        requiredIdsByCourse.set(course.id, [...(requiredIdsByCourse.get(course.id) ?? []), item.id])
      }
    }
  }
  const reviewedSet = new Set([...reviewedScripts, ...reviewedObjections, ...reviewedFaqs])

  const generalScripts = (rawGeneralScripts ?? []).sort((a, b) =>
    scriptTypePriority(a.script_type) - scriptTypePriority(b.script_type) ||
    a.title.localeCompare(b.title)
  )
  const generalObjections = rawGeneralObjections ?? []
  const generalFaqs = rawGeneralFaqs ?? []

  // Pre-render content for each tab
  const coursesContent = (
    <div>
      {courses.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-sm">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          No courses published yet. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {courses.map(course => {
            const allLessons = lessonsByCourse[course.id] ?? []
            const completedLessonsCount = allLessons.filter(id => completedSet.has(id)).length
            const assignment = assignmentByCourse[course.id]
            const requiredIds = requiredIdsByCourse.get(course.id) ?? []
            const completedReviewsCount = requiredIds.filter(id => reviewedSet.has(id)).length

            return (
              <StudentCourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description ?? null}
                thumbnail_url={course.thumbnail_url ?? null}
                category={course.category ?? null}
                difficulty={course.difficulty ?? null}
                lessonCount={allLessons.length}
                completedCount={completedLessonsCount}
                reviewCount={requiredIds.length}
                completedReviewCount={completedReviewsCount}
                durationMinutes={course.estimated_duration_minutes ?? null}
                dueDate={assignment?.due_date ?? null}
              />
            )
          })}
        </div>
      )}
    </div>
  )

  const scriptsContent = (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sales Scripts & Message Templates</h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          Ready-to-use scripts for WhatsApp, voice notes, objection responses, and closing lines. Click &ldquo;Copy Script&rdquo; to paste directly.
        </p>
      </div>
      <SalesmanScriptViewer
        scripts={generalScripts}
        initialReviewed={reviewedScripts}
        initialViewMode="list"
      />
    </div>
  )

  const objectionsContent = (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Objection Handling Playbook</h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          Learn how to turn common customer doubts into closed deals. Study the recommended responses and avoid common pitfalls.
        </p>
      </div>
      <SalesmanObjectionViewer
        objections={generalObjections}
        initialReviewed={reviewedObjections}
      />
    </div>
  )

  const faqsContent = (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Knowledge Base — FAQs</h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          Quickly find answers to common customer questions. Use &ldquo;Copy Answer&rdquo; to send responses directly to clients.
        </p>
      </div>
      <SalesmanFAQViewer
        faqs={generalFaqs}
        initialReviewed={reviewedFaqs}
        initialViewMode="list"
      />
    </div>
  )

  return (
    <div className="px-4 py-5 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          {courses.length} course{courses.length !== 1 ? 's' : ''} · {generalScripts.length} scripts · {generalObjections.length} objections · {generalFaqs.length} FAQs available
        </p>
      </div>

      {/* Tabs */}
      <TrainingTabs
        initialTab={searchParams?.tab || 'courses'}
        coursesCount={courses.length}
        scriptsCount={generalScripts.length}
        objectionsCount={generalObjections.length}
        faqsCount={generalFaqs.length}
        coursesContent={coursesContent}
        scriptsContent={scriptsContent}
        objectionsContent={objectionsContent}
        faqsContent={faqsContent}
      />
    </div>
  )
}
