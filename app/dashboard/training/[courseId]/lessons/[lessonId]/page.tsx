import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LessonViewer } from '@/components/training/LessonViewer'
import { ChevronLeft, Clock, Star } from 'lucide-react'

export default async function LessonViewerPage({
  params,
}: {
  params: { courseId: string; lessonId: string }
}) {
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

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', params.lessonId)
    .eq('status', 'published')
    .single()
  if (!lesson) notFound()

  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('id', params.courseId)
    .single()

  const { data: blocks } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('lesson_id', params.lessonId)
    .order('order_index')

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed')
    .eq('lesson_id', params.lessonId)
    .eq('user_id', user.id)
    .single()

  const isCompleted = progress?.completed ?? false

  return (
    <div className="p-8 max-w-3xl animate-fade-in">
      <Link
        href={`/dashboard/training/${params.courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {course?.title ?? 'Course'}
      </Link>

      {/* Lesson header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
          {lesson.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {lesson.duration_minutes} min
            </span>
          )}
          {lesson.difficulty && (
            <span className="capitalize">{lesson.difficulty}</span>
          )}
          {!lesson.is_required && (
            <span className="bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded">Optional</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{lesson.title}</h1>
        {lesson.subtitle && (
          <p className="text-brand-500 text-sm font-medium">{lesson.subtitle}</p>
        )}
        {lesson.description && (
          <p className="text-gray-400 text-sm mt-2">{lesson.description}</p>
        )}
      </div>

      {/* Lesson content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <LessonViewer
          lessonId={lesson.id}
          courseId={params.courseId}
          blocks={blocks ?? []}
          isCompleted={isCompleted}
        />
      </div>
    </div>
  )
}
