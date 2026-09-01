import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Plus, Edit, Trash2, GripVertical, Clock } from 'lucide-react'
import { deleteLesson } from '@/lib/actions/lessons'

async function deleteLessonAction(lessonId: string, moduleId: string, courseId: string) {
  'use server'
  await deleteLesson(lessonId, moduleId, courseId)
}

export default async function ModuleDetailPage({
  params,
}: {
  params: { id: string; moduleId: string }
}) {
  const supabase = await createClient()

  const [{ data: course }, { data: module }] = await Promise.all([
    supabase.from('courses').select('id, title').is('deleted_at', null).eq('id', params.id).single(),
    supabase.from('modules').select('*').is('deleted_at', null).eq('id', params.moduleId).single(),
  ])
  if (!course || !module) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*').is('deleted_at', null)
    .eq('module_id', params.moduleId)
    .order('order_index', { ascending: true })

  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: module.title },
      ]} />

      {/* Module header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={module.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{module.title}</h1>
            {module.description && <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{module.description}</p>}
            {module.duration_minutes && (
              <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-2">
                <Clock className="w-3.5 h-3.5" /> {module.duration_minutes} min
              </p>
            )}
          </div>
          <Link
            href={`/admin/courses/${course.id}/modules/${module.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 dark:text-gray-500 text-sm font-medium hover:bg-gray-50 dark:bg-gray-900 transition"
          >
            <Edit className="w-4 h-4" /> Edit Module
          </Link>
        </div>
      </div>

      {/* Lessons section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Lessons ({lessons?.length ?? 0})
        </h2>
        <Link
          href={`/admin/courses/${course.id}/modules/${module.id}/lessons/new`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
        >
          <Plus className="w-4 h-4" /> Add Lesson
        </Link>
      </div>

      {(!lessons || lessons.length === 0) && (
        <div className="text-center py-12 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 text-sm">
          No lessons yet. Add your first lesson to start building content.
        </div>
      )}

      <div className="space-y-2">
        {lessons?.map((lesson, index) => (
          <div key={lesson.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-gray-200 dark:border-gray-600 transition">
            <div className="text-gray-200 flex-shrink-0 cursor-grab">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{lesson.title}</p>
                <StatusBadge status={lesson.status} />
                {!lesson.is_required && (
                  <span className="text-xs text-gray-300 bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded">Optional</span>
                )}
              </div>
              {lesson.subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lesson.subtitle}</p>}
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-300">
                {lesson.duration_minutes && <span>{lesson.duration_minutes} min</span>}
                {lesson.difficulty && <span className="capitalize">{lesson.difficulty}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Link
                href={`/admin/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition"
              >
                Edit Content →
              </Link>
              <form action={deleteLessonAction.bind(null, lesson.id, module.id, course.id)}>
                <button type="submit" className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
