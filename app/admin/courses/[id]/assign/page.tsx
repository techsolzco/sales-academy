import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { AssignmentPanel } from '@/components/admin/AssignmentPanel'
import { StatusBadge } from '@/components/admin/StatusBadge'

export default async function AssignCoursePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: course } = await supabase.from('courses').select('*').eq('id', params.id).single()
  if (!course) notFound()

  // Fetch all active salesmen
  const { data: allSalesmen } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'salesman')
    .eq('status', 'active')
    .order('full_name')

  // Fetch current assignments with progress
  const { data: assignments } = await supabase
    .from('course_assignments')
    .select('user_id, assigned_at')
    .eq('course_id', params.id)

  // Fetch total lesson count for this course
  const { data: modules } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', params.id)

  const moduleIds = (modules ?? []).map(m => m.id)
  const { data: lessons } = moduleIds.length > 0
    ? await supabase.from('lessons').select('id').in('module_id', moduleIds)
    : { data: [] }
  const totalLessons = lessons?.length ?? 0

  // Fetch lesson completion per assigned user
  const assignedUserIds = (assignments ?? []).map(a => a.user_id)
  const { data: progressRows } = assignedUserIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id')
        .in('user_id', assignedUserIds)
        .eq('completed', true)
    : { data: [] }

  const progressByUser = (progressRows ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.user_id] = (acc[p.user_id] ?? 0) + 1
    return acc
  }, {})

  // Build enriched assigned users list
  const profileMap = Object.fromEntries((allSalesmen ?? []).map(p => [p.id, p]))
  const assignedUsers = (assignments ?? [])
    .map(a => {
      const profile = profileMap[a.user_id]
      if (!profile) return null
      return {
        user_id: a.user_id,
        full_name: profile.full_name,
        email: profile.email,
        department: profile.department,
        completed_lessons: progressByUser[a.user_id] ?? 0,
        total_lessons: totalLessons,
      }
    })
    .filter(Boolean) as {
      user_id: string; full_name: string; email: string;
      department: string | null; completed_lessons: number; total_lessons: number
    }[]

  return (
    <div className="p-8 max-w-6xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title, href: `/admin/courses/${course.id}` },
        { label: 'Assign' },
      ]} />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Course Assignment</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-500 text-sm">{course.title}</p>
            <StatusBadge status={course.status} />
          </div>
        </div>
        {course.status === 'draft' && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xs">
            ⚠ This course is a draft. Assigned salesmen won&apos;t see it until it&apos;s published.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <AssignmentPanel
          courseId={params.id}
          allSalesmen={allSalesmen ?? []}
          assignedUsers={assignedUsers}
        />
      </div>
    </div>
  )
}
