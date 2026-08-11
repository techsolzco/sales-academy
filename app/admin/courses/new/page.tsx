import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { CourseForm } from '@/components/admin/CourseForm'

export default function NewCoursePage() {
  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: 'New Course' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Course</h1>
      <p className="text-gray-400 text-sm mb-8">
        Start with the basics — you can add modules and lessons after saving.
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <CourseForm />
      </div>
    </div>
  )
}
