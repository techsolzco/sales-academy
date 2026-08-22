import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { LessonForm } from '@/components/admin/LessonForm'

export default async function NewLessonPage({
  params,
}: {
  params: { id: string; moduleId: string }
}) {
  const supabase = await createClient()
  const [{ data: course }, { data: module }] = await Promise.all([
    supabase.from('courses').select('id, title').is('deleted_at', null).eq('id', params.id).single(),
    supabase.from('modules').select('id, title').is('deleted_at', null).eq('id', params.moduleId).single(),
  ])
  if (!course || !module) notFound()

  return (
    <div className="px-4 py-5 md:p-8 max-w-2xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: module.title, href: `/admin/courses/${course.id}/modules/${module.id}` },
        { label: 'New Lesson' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add Lesson</h1>
      <p className="text-gray-400 text-sm mb-8">
        After saving, you can add content blocks (text, video, images, etc.) to this lesson.
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <LessonForm moduleId={module.id} courseId={course.id} />
      </div>
    </div>
  )
}
