import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { LessonForm } from '@/components/admin/LessonForm'
import { ContentBlockEditor } from '@/components/admin/ContentBlockEditor'
import { Clock, Star } from 'lucide-react'

export default async function LessonEditorPage({
  params,
}: {
  params: { id: string; moduleId: string; lessonId: string }
}) {
  const supabase = await createClient()

  const [{ data: course }, { data: module }, { data: lesson }, { data: blocks }] = await Promise.all([
    supabase.from('courses').select('id, title').eq('id', params.id).single(),
    supabase.from('modules').select('id, title').eq('id', params.moduleId).single(),
    supabase.from('lessons').select('*').eq('id', params.lessonId).single(),
    supabase.from('content_blocks').select('*').eq('lesson_id', params.lessonId).order('order_index'),
  ])

  if (!course || !module || !lesson) notFound()

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: module.title, href: `/admin/courses/${course.id}/modules/${module.id}` },
        { label: lesson.title },
      ]} />

      {/* Lesson metadata */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={lesson.status} />
          {!lesson.is_required && (
            <span className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded-md">Optional</span>
          )}
          {lesson.difficulty && (
            <span className="text-xs text-gray-400 capitalize">{lesson.difficulty}</span>
          )}
          {lesson.duration_minutes && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" /> {lesson.duration_minutes} min
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{lesson.title}</h1>
        {lesson.subtitle && <p className="text-brand-500 text-sm font-medium mb-1">{lesson.subtitle}</p>}
        {lesson.description && <p className="text-gray-400 text-sm">{lesson.description}</p>}

        {/* Edit lesson metadata inline */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-brand-600 hover:text-brand-700 font-medium">
            Edit lesson details
          </summary>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <LessonForm moduleId={module.id} courseId={course.id} lesson={lesson} />
          </div>
        </details>
      </div>

      {/* Content blocks */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Content Blocks</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Drag to reorder · Click a block to edit its content
            </p>
          </div>
          <span className="text-xs text-gray-300">{blocks?.length ?? 0} block{blocks?.length !== 1 ? 's' : ''}</span>
        </div>

        <ContentBlockEditor
          lessonId={lesson.id}
          moduleId={module.id}
          courseId={course.id}
          initialBlocks={blocks ?? []}
        />
      </div>
    </div>
  )
}
