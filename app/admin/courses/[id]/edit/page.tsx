import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { CourseForm } from '@/components/admin/CourseForm'

export default async function EditCoursePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const [{ data: course }, { data: tools }] = await Promise.all([
    supabase.from('courses').select('*').is('deleted_at', null).eq('id', params.id).single(),
    supabase.from('tools').select('id, name').is('deleted_at', null).order('name'),
  ])
  if (!course) notFound()

  return (
    <div className="px-4 py-5 md:p-8 max-w-2xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: 'Edit' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Edit Course</h1>
      <p className="text-gray-400 text-sm mb-8">Update course details.</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <CourseForm course={course} tools={tools ?? []} />
      </div>
    </div>
  )
}
