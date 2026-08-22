import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CourseCard } from '@/components/admin/CourseCard'
import { BookOpen, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function AdminCoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('*').is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Fetch module counts and assignment counts in parallel
  const [{ data: moduleCounts }, { data: assignmentCounts }] = await Promise.all([
    supabase.from('modules').select('course_id').is('deleted_at', null),
    supabase.from('course_assignments').select('course_id'),
  ])

  const moduleCountMap = (moduleCounts ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.course_id] = (acc[m.course_id] ?? 0) + 1
    return acc
  }, {})

  const assignmentCountMap = (assignmentCounts ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.course_id] = (acc[a.course_id] ?? 0) + 1
    return acc
  }, {})

  const published = (courses ?? []).filter(c => c.status === 'published').length
  const drafts = (courses ?? []).filter(c => c.status === 'draft').length

  return (
    <div className="px-4 py-5 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-400 mt-1">
            {courses?.length ?? 0} total · {published} published · {drafts} draft
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create New Course
        </Link>
      </div>

      {/* Empty state */}
      {(!courses || courses.length === 0) && (
        <EmptyState 
          icon={BookOpen} 
          title="No courses yet" 
          description="Create your first course  give it a name, add modules and lessons, then assign it to your sales team." 
          actionLabel="Create First Course" 
          actionHref="/admin/courses/new" 
        />
      )}

      {/* Course grid */}
      {courses && courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              description={course.description}
              thumbnail_url={course.thumbnail_url}
              category={course.category}
              difficulty={course.difficulty}
              status={course.status}
              moduleCount={moduleCountMap[course.id] ?? 0}
              assignmentCount={assignmentCountMap[course.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
