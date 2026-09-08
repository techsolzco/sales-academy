import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { CourseForm } from '@/components/admin/CourseForm'
import { createClient } from '@/lib/supabase/server'

export default async function NewCoursePage() {
  const supabase = await createClient()
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="px-4 py-5 md:p-8 max-w-2xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: 'New Course' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create New Course</h1>
      <p className="text-gray-400 text-sm mb-8">
        Start with the basics — you can add modules and lessons after saving.
      </p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <CourseForm tools={tools ?? []} />
      </div>
    </div>
  )
}
