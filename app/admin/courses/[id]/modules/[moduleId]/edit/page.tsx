import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { ModuleForm } from '@/components/admin/ModuleForm'

export default async function EditModulePage({
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

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: module.title, href: `/admin/courses/${course.id}/modules/${module.id}` },
        { label: 'Edit' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Module</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
        <ModuleForm courseId={course.id} module={module} />
      </div>
    </div>
  )
}
