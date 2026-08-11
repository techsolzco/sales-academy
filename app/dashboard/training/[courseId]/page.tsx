import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, Circle, Lock, ChevronLeft, Clock, BookOpen } from 'lucide-react'

export default async function TrainingCoursePage({ params }: { params: { courseId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify assignment
  const { data: assignment } = await supabase
    .from('course_assignments')
    .select('id')
    .eq('course_id', params.courseId)
    .eq('user_id', user.id)
    .single()
  if (!assignment) redirect('/dashboard/training')

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.courseId)
    .eq('status', 'published')
    .single()
  if (!course) notFound()

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', params.courseId)
    .order('order_index')

  const allLessonIds = (modules ?? []).flatMap(m =>
    (m.lessons as { id: string }[]).map(l => l.id)
  )

  const { data: progress } = allLessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .in('lesson_id', allLessonIds)
    : { data: [] }

  const completedIds = new Set(
    (progress ?? []).filter(p => p.completed).map(p => p.lesson_id)
  )

  const totalLessons = allLessonIds.length
  const completedCount = allLessonIds.filter(id => completedIds.has(id)).length
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <div className="p-8 max-w-3xl animate-fade-in">
      <Link
        href="/dashboard/training"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Training
      </Link>

      {/* Course header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        {course.category && <p className="text-xs text-brand-500 font-medium mb-1">{course.category}</p>}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
        {course.description && <p className="text-gray-400 text-sm mb-4">{course.description}</p>}

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">{pct}%</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {completedCount} of {totalLessons} lessons completed
        </p>
      </div>

      {/* Modules and lessons */}
      <div className="space-y-4">
        {(modules ?? []).map((mod, modIndex) => {
          const lessons = (mod.lessons as { id: string; title: string; subtitle: string | null; duration_minutes: number | null; is_required: boolean; status: string }[])
            .filter(l => l.status === 'published')
            .sort((a, b) => 0) // already ordered from DB
          const modCompleted = lessons.filter(l => completedIds.has(l.id)).length

          return (
            <div key={mod.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Module header */}
              <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Module {modIndex + 1}</p>
                    <h3 className="font-semibold text-gray-900 text-sm">{mod.title}</h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {modCompleted}/{lessons.length}
                  </span>
                </div>
              </div>

              {/* Lessons list */}
              {lessons.length === 0 && (
                <p className="px-5 py-4 text-xs text-gray-300 italic">No published lessons in this module yet.</p>
              )}
              {lessons.map((lesson, i) => {
                const isCompleted = completedIds.has(lesson.id)
                return (
                  <Link
                    key={lesson.id}
                    href={`/dashboard/training/${course.id}/lessons/${lesson.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-brand-50/50 transition border-b border-gray-50 last:border-0 group"
                  >
                    {isCompleted
                      ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-gray-200 group-hover:text-brand-300 flex-shrink-0 transition" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {lesson.title}
                      </p>
                      {lesson.subtitle && <p className="text-xs text-gray-400 truncate">{lesson.subtitle}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-300 flex-shrink-0">
                      {!lesson.is_required && <span className="italic">optional</span>}
                      {lesson.duration_minutes && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {lesson.duration_minutes}m
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
