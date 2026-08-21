import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { CourseForm } from '@/components/admin/CourseForm'

export default async function EditCoursePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('*').is('deleted_at', null).eq('id', params.id).single()
  if (!course) notFound()

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: 'Edit' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Course</h1>
      <p className="text-gray-400 text-sm mb-8">Update course details.</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <CourseForm course={course} />
      </div>
    </div>
  )
}
