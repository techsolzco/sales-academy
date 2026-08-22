import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { ModuleForm } from '@/components/admin/ModuleForm'

export default async function NewModulePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('id, title').is('deleted_at', null).eq('id', params.id).single()
  if (!course) notFound()

  return (
    <div className="px-4 py-5 md:p-8 max-w-2xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: 'New Module' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add Module</h1>
      <p className="text-gray-400 text-sm mb-8">Modules are the chapters of your course.</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <ModuleForm courseId={course.id} />
      </div>
    </div>
  )
}
