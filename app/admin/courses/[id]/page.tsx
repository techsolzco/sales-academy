import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { BookOpen, Clock, GripVertical, Plus, Edit, Trash2, UserPlus } from 'lucide-react'
import { publishCourse, archiveCourse, unpublishCourse } from '@/lib/actions/courses'
import { deleteModule } from '@/lib/actions/modules'

import { FAQManager } from '@/components/admin/FAQManager'
import { ScriptManager } from '@/components/admin/ScriptManager'
import { ObjectionManager } from '@/components/admin/ObjectionManager'

import { TabLangToggle } from '@/components/ui/TabLangToggle'
import { EmptyState } from '@/components/ui/EmptyState'

async function publishAction(id: string) {
  'use server'
  await publishCourse(id)
}
async function unpublishAction(id: string) {
  'use server'
  await unpublishCourse(id)
}
async function deleteModuleAction(moduleId: string, courseId: string) {
  'use server'
  await deleteModule(moduleId, courseId)
}

export default async function CourseDetailPage({ 
  params,
  searchParams 
}: { 
  params: { id: string },
  searchParams: { tab?: string, lang?: string } 
}) {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*').is('deleted_at', null)
    .eq('id', params.id)
    .single()

  if (!course) notFound()

  const tab = searchParams.tab || 'lessons'
  const lang = (searchParams.lang as 'en' | 'hi') || 'en'

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(count)').is('deleted_at', null)
    .eq('course_id', params.id)
    .order('order_index', { ascending: true })

  const { count: assignmentTotal } = await supabase
    .from('course_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', params.id)
    .then(r => ({ count: r.count ?? 0 }))

  let tabContent = null
  const showContentTabs = course.tool_id !== null

  if (tab === 'lessons') {
    tabContent = (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
          <Link
            href={`/admin/courses/${course.id}/modules/new`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Module
          </Link>
        </div>

        {(!modules || modules.length === 0) && (
          <div className="text-center py-12 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
            No modules yet. Add your first module to start building content.
          </div>
        )}

        <div className="space-y-2">
          {modules?.map((mod, index) => {
            const lessonCount = (mod.lessons as unknown as { count: number }[])?.[0]?.count ?? 0
            return (
              <div key={mod.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition">
                <div className="text-gray-200 flex-shrink-0 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{mod.title}</p>
                    <StatusBadge status={mod.status} />
                  </div>
                  {mod.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{mod.description}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">{lessonCount} lesson{lessonCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    href={`/admin/courses/${course.id}/modules/${mod.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition"
                  >
                    Open →
                  </Link>
                  <Link
                    href={`/admin/courses/${course.id}/modules/${mod.id}/edit`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Link>
                  <form action={deleteModuleAction.bind(null, mod.id, course.id)}>
                    <button type="submit" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  } else if (tab === 'faqs' && showContentTabs) {
    const { data: faqs } = await supabase.from('faqs').select('*').is('deleted_at', null).eq('tool_id', course.tool_id).order('priority', { ascending: false }).order('created_at', { ascending: false })
    tabContent = (
      <div className="mt-4">
        <FAQManager initialFaqs={faqs ?? []} initialToolId={course.tool_id} />
      </div>
    )
  } else if (tab === 'scripts' && showContentTabs) {
    const { data: scripts } = await supabase.from('scripts').select('*').is('deleted_at', null).eq('tool_id', course.tool_id).order('created_at', { ascending: false })
    const { data: copiesRes } = await supabase.from('script_copies').select('script_id')
    const copyCounts: Record<string, number> = {}
    for (const row of copiesRes ?? []) {
      copyCounts[row.script_id] = (copyCounts[row.script_id] ?? 0) + 1
    }
    tabContent = (
      <div className="mt-4">
        <ScriptManager initialScripts={scripts ?? []} copyCounts={copyCounts} initialToolId={course.tool_id} />
      </div>
    )
  } else if (tab === 'objections' && showContentTabs) {
    const { data: objections } = await supabase.from('objections').select('*').is('deleted_at', null).eq('tool_id', course.tool_id).order('created_at', { ascending: false })
    tabContent = (
      <div className="mt-4">
        <ObjectionManager initialObjections={objections ?? []} initialToolId={course.tool_id} />
      </div>
    )
  } else if (tab === 'assignments' && showContentTabs) {
    const { data: assignments } = await supabase.from('assignments').select('*, course:courses(title), lesson:lessons(title)').is('deleted_at', null).eq('tool_id', course.tool_id).order('created_at', { ascending: false })
    const { data: submissions } = await supabase.from('assignment_submissions').select('assignment_id, status')
    
    const stats = assignments?.map(a => {
      const subs = submissions?.filter(s => s.assignment_id === a.id) || []
      return {
        ...a,
        submissionCount: subs.length,
        pendingCount: subs.filter(s => s.status === 'pending').length
      }
    }) || []

    tabContent = (
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Context</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-5 md:p-8">
                  <EmptyState 
                    icon={BookOpen} 
                    title="No assignments linked to this tool" 
                    description="Assignments created for this tool will appear here." 
                  />
                </td>
              </tr>
            ) : (
              stats.map((assignment: any) => (
                <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/admin/assignments/${assignment.id}`} className="font-medium text-gray-900 block hover:text-brand-600">
                      {assignment.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-medium">{assignment.course?.title}</div>
                    {assignment.lesson && <div className="text-xs text-gray-400">{assignment.lesson.title}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {assignment.submissionCount} total
                      </span>
                      {assignment.pendingCount > 0 && (
                        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {assignment.pendingCount} pending
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Courses', href: '/admin/courses' },
        { label: course.title },
      ]} />

      {/* Course header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={course.status} />
              {course.category && <span className="text-xs text-gray-400">{course.category}</span>}
              {course.difficulty && (
                <span className="text-xs text-gray-400 capitalize">{course.difficulty}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{course.title}</h1>
            {course.description && <p className="text-gray-400 text-sm">{course.description}</p>}

            <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> {modules?.length ?? 0} modules
              </span>
              {course.estimated_duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {course.estimated_duration_minutes} min
                </span>
              )}
            {assignmentTotal} salesmen assigned
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/admin/courses/${course.id}/assign`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              <UserPlus className="w-4 h-4" /> Assign
            </Link>
            <Link
              href={`/admin/courses/${course.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              <Edit className="w-4 h-4" /> Edit
            </Link>
            {course.status === 'draft' && (
              <form action={publishAction.bind(null, course.id)}>
                <button type="submit" className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
                  Publish
                </button>
              </form>
            )}
            {course.status === 'published' && (
              <form action={unpublishAction.bind(null, course.id)}>
                <button type="submit" className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
                  Unpublish
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
        <div className="flex gap-6 overflow-x-auto">
          <Link
            href={`/admin/courses/${course.id}?tab=lessons&lang=${lang}`}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              tab === 'lessons' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lessons
          </Link>
          {showContentTabs && (
            <>
              <Link
                href={`/admin/courses/${course.id}?tab=faqs&lang=${lang}`}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  tab === 'faqs' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                FAQs
              </Link>
              <Link
                href={`/admin/courses/${course.id}?tab=scripts&lang=${lang}`}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  tab === 'scripts' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Scripts
              </Link>
              <Link
                href={`/admin/courses/${course.id}?tab=objections&lang=${lang}`}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  tab === 'objections' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Objections
              </Link>
              <Link
                href={`/admin/courses/${course.id}?tab=assignments&lang=${lang}`}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  tab === 'assignments' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Assignments
              </Link>
            </>
          )}
        </div>
        {showContentTabs && (
          <div className="ml-4">
            <TabLangToggle currentLang={lang} />
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {tabContent}
      </div>
    </div>
  )
}
