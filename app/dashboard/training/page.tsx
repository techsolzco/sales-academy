import { createClient } from '@/lib/supabase/server'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { BookOpen } from 'lucide-react'
import { getGreeting } from '@/lib/utils'
import { StudentCourseCard } from '@/components/training/StudentCourseCard'

export default async function TrainingPage() {
  const supabase = await createClient()
  const { userId, profile } = await getEffectiveUser()

  // Get assignment metadata (due dates etc.) — optional, not required to see courses
  const { data: assignments } = await supabase
    .from('course_assignments')
    .select('course_id, assigned_at, due_date')
    .eq('user_id', userId)

  // Fetch ALL published courses (visible to every logged-in student)
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .is('deleted_at', null)
    .eq('status', 'published')
    .order('created_at', { ascending: true })

  if (!courses || courses.length === 0) {
    return (
      <div className="px-4 py-5 md:p-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Your training courses will appear here once they&apos;re published.</p>
        </div>
        <div className="text-center py-20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-sm">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          No courses published yet. Check back soon!
        </div>
      </div>
    )
  }

  const courseIds = courses.map(c => c.id)

  // Get all lessons for these courses (for progress calc)
  const { data: modules } = await supabase
    .from('modules').select('id, course_id').is('deleted_at', null).in('course_id', courseIds)

  const moduleIds = (modules ?? []).map(m => m.id)
  const { data: lessons } = moduleIds.length > 0
    ? await supabase.from('lessons').select('id, module_id').is('deleted_at', null).in('module_id', moduleIds)
    : { data: [] }

  // Build course→lesson map
  const moduleCoursMap = Object.fromEntries((modules ?? []).map(m => [m.id, m.course_id]))
  const lessonsByCourse = (lessons ?? []).reduce<Record<string, string[]>>((acc, l) => {
    const cid = moduleCoursMap[l.module_id]
    if (cid) { if (!acc[cid]) acc[cid] = []; acc[cid].push(l.id) }
    return acc
  }, {})

  // Get user's lesson progress
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

  // Fetch required KB items for courses linked to a tool
  const toolIds = Array.from(new Set(courses.map(c => c.tool_id).filter(Boolean))) as string[]
  const [{ data: allFaqs }, { data: allScripts }, { data: allObjections }, { data: allVoiceNotes }] = toolIds.length > 0
    ? await Promise.all([
        supabase.from('faqs').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published'),
        supabase.from('scripts').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published'),
        supabase.from('objections').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published'),
        supabase.from('voice_notes').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published')
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const kbItems = [
    ...(allFaqs ?? []),
    ...(allScripts ?? []),
    ...(allObjections ?? []),
    ...(allVoiceNotes ?? [])
  ]

  const kbItemsByTool = kbItems.reduce((acc, item) => {
    if (!item.tool_id) return acc
    if (!acc[item.tool_id]) acc[item.tool_id] = []
    acc[item.tool_id].push(item.id)
    return acc
  }, {} as Record<string, string[]>)

  const allKbItemIds = kbItems.map(k => k.id)
  const { data: kbReviews } = allKbItemIds.length > 0
    ? await supabase.from('kb_reviews').select('content_id').eq('user_id', userId).in('content_id', allKbItemIds)
    : { data: [] }
    
  const reviewedKbIds = new Set((kbReviews ?? []).map(r => r.content_id))

  const assignmentByCourse = Object.fromEntries((assignments ?? []).map(a => [a.course_id, a]))

  return (
    <div className="px-4 py-5 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          {courses.length} course{courses.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Card grid — same layout as admin courses page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {courses.map(course => {
          const allLessons = lessonsByCourse[course.id] ?? []
          const completedLessonsCount = allLessons.filter(id => completedSet.has(id)).length
          const assignment = assignmentByCourse[course.id]

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
              durationMinutes={course.estimated_duration_minutes ?? null}
              dueDate={assignment?.due_date ?? null}
            />
          )
        })}
      </div>
    </div>
  )
}
