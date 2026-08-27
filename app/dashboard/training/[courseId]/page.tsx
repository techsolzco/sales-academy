import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { CheckCircle, Circle, Lock, ChevronLeft, Clock, BookOpen, AlertCircle } from 'lucide-react'
import { ReviewButton } from './ReviewButton'
import { SalesmanFAQViewer } from '@/components/training/SalesmanFAQViewer'
import { SalesmanScriptViewer } from '@/components/training/SalesmanScriptViewer'
import { SalesmanObjectionViewer } from '@/components/training/SalesmanObjectionViewer'

import { TabLangToggle } from '@/components/ui/TabLangToggle'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function TrainingCoursePage({ 
  params,
  searchParams
}: { 
  params: { courseId: string },
  searchParams: { tab?: string, lang?: string } 
}) {
  const supabase = await createClient()
  const { userId } = await getEffectiveUser()

  // Verify assignment
  const { data: assignment } = await supabase
    .from('course_assignments')
    .select('id')
    .eq('course_id', params.courseId)
    .eq('user_id', userId)
    .single()
  if (!assignment) redirect('/dashboard/training')

  const { data: course } = await supabase
    .from('courses')
    .select('*').is('deleted_at', null)
    .eq('id', params.courseId)
    .eq('status', 'published')
    .single()
  if (!course) notFound()

  const tab = searchParams.tab || 'lessons'
  const lang = (searchParams.lang as 'en' | 'hi') || 'en'

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)').is('deleted_at', null)
    .eq('course_id', params.courseId)
    .order('order_index')

  const allLessonIds = (modules ?? []).flatMap(m =>
    (m.lessons as { id: string }[]).map(l => l.id)
  )

  const { data: progress } = allLessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', userId)
        .in('lesson_id', allLessonIds)
    : { data: [] }

  const completedIds = new Set(
    (progress ?? []).filter(p => p.completed).map(p => p.lesson_id)
  )

  const totalLessons = allLessonIds.length
  const completedCount = allLessonIds.filter(id => completedIds.has(id)).length

  // Fetch required reading (KB items)
  let requiredReads: Array<{ id: string, title: string, type: string }> = []
  let faqs = null
  let scripts = null
  let objections = null
  
  if (course.tool_id) {
    const [
      faqsRes,
      scriptsRes,
      objectionsRes,
    ] = await Promise.all([
      supabase.from('faqs').select('*').is('deleted_at', null).eq('tool_id', course.tool_id).eq('status', 'published'),
      supabase.from('scripts').select('*').is('deleted_at', null).eq('tool_id', course.tool_id).eq('status', 'published'),
      supabase.from('objections').select('*').is('deleted_at', null).eq('tool_id', course.tool_id).eq('status', 'published'),
    ])
    
    faqs = faqsRes.data
    scripts = scriptsRes.data
    objections = objectionsRes.data

    if (faqs) requiredReads.push(...faqs.map(f => ({ id: f.id, title: f.question, type: 'faq' })))
    if (scripts) requiredReads.push(...scripts.map(s => ({ id: s.id, title: s.title, type: 'script' })))
    if (objections) requiredReads.push(...objections.map(o => ({ id: o.id, title: o.objection_text, type: 'objection' })))
  }

  const { data: reviews } = requiredReads.length > 0 
    ? await supabase
        .from('kb_reviews')
        .select('content_id')
        .eq('user_id', userId)
        .in('content_id', requiredReads.map(r => r.id))
    : { data: [] }
    
  const reviewedIdsArray = (reviews ?? []).map(r => r.content_id)
  const reviewedIds = new Set(reviewedIdsArray)
  const completedReviewsCount = requiredReads.filter(r => reviewedIds.has(r.id)).length

  const totalItems = totalLessons + requiredReads.length
  const completedCountTotal = completedCount + completedReviewsCount
  const pct = totalItems > 0 ? Math.round((completedCountTotal / totalItems) * 100) : 0
  const showContentTabs = course.tool_id !== null

  let assignments = null
  let submissions = null
  if (course.tool_id && tab === 'assignments') {
    const [aRes, sRes] = await Promise.all([
      supabase.from('assignments').select('*, course:courses(title), lesson:lessons(title)').is('deleted_at', null).eq('tool_id', course.tool_id).order('created_at', { ascending: false }),
      supabase.from('assignment_submissions').select('assignment_id, status').eq('user_id', userId)
    ])
    assignments = aRes.data
    submissions = sRes.data
  }

  let tabContent = null
  
  if (tab === 'lessons') {
    tabContent = (
      <div className="space-y-4 mt-6">
        {(modules ?? []).map((mod, modIndex) => {
          const lessons = (mod.lessons as { id: string; title: string; subtitle: string | null; duration_minutes: number | null; is_required: boolean; status: string }[])
            .filter(l => l.status === 'published')
            .sort((a, b) => 0) // already ordered from DB
          const modCompleted = lessons.filter(l => completedIds.has(l.id)).length

          return (
            <div key={mod.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Module header */}
              <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Module {modIndex + 1}</p>
                    <h3 className="font-semibold text-gray-900 text-sm">{mod.title}</h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {modCompleted}/{lessons.length}
                  </span>
                </div>
              </div>

              {/* Lessons list */}
              {lessons.length === 0 && (
                <p className="px-5 py-4 text-xs text-gray-300 italic">No published lessons in this module yet.</p>
              )}
              {lessons.map((lesson, i) => {
                const isCompleted = completedIds.has(lesson.id)
                return (
                  <Link
                    key={lesson.id}
                    href={`/dashboard/training/${course.id}/lessons/${lesson.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-brand-50/50 transition border-b border-gray-50 last:border-0 group"
                  >
                    {isCompleted
                      ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-gray-200 group-hover:text-brand-300 flex-shrink-0 transition" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {lesson.title}
                      </p>
                      {lesson.subtitle && <p className="text-xs text-gray-400 truncate">{lesson.subtitle}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-300 flex-shrink-0">
                      {!lesson.is_required && <span className="italic">optional</span>}
                      {lesson.duration_minutes && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {lesson.duration_minutes}m
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}

        {/* Required Reading */}
        {requiredReads.length > 0 && (
          <div className="bg-white rounded-xl border border-brand-100 overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-brand-50 bg-brand-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-brand-500" />
                  <h3 className="font-semibold text-brand-900 text-sm">Required Reading</h3>
                </div>
                <span className="text-xs text-brand-600 font-medium">
                  {completedReviewsCount}/{requiredReads.length}
                </span>
              </div>
              <p className="text-xs text-brand-600/70 mt-1">
                You must review these tool materials to complete the course.
              </p>
            </div>
            <div>
              {requiredReads.map(item => (
                <ReviewButton 
                  key={item.id} 
                  item={item} 
                  isReviewed={reviewedIds.has(item.id)}
                  courseId={course.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  } else if (tab === 'faqs' && showContentTabs) {
    tabContent = (
      <div className="mt-6">
        <SalesmanFAQViewer faqs={faqs ?? []} initialReviewed={reviewedIdsArray} initialToolId={course.tool_id!} />
      </div>
    )
  } else if (tab === 'scripts' && showContentTabs) {
    tabContent = (
      <div className="mt-6">
        <SalesmanScriptViewer scripts={scripts ?? []} initialReviewed={reviewedIdsArray} initialToolId={course.tool_id!} />
      </div>
    )
  } else if (tab === 'objections' && showContentTabs) {
    tabContent = (
      <div className="mt-6">
        <SalesmanObjectionViewer objections={objections ?? []} initialReviewed={reviewedIdsArray} initialToolId={course.tool_id!} />
      </div>
    )
  } else if (tab === 'assignments' && showContentTabs) {
    const stats = assignments?.map(a => {
      const sub = submissions?.find(s => s.assignment_id === a.id)
      return {
        ...a,
        submissionStatus: sub?.status || 'unsubmitted'
      }
    }) || []

    tabContent = (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-5 md:p-8">
                  <EmptyState 
                    icon={BookOpen} 
                    title="No assignments" 
                    description="No assignments are linked to this tool." 
                  />
                </td>
              </tr>
            ) : (
              stats.map((assignment: any) => (
                <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/assignments/${assignment.id}`} className="font-medium text-gray-900 block hover:text-brand-600">
                      {assignment.title}
                    </Link>
                    {assignment.due_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {assignment.submissionStatus === 'graded' && <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold">Graded</span>}
                    {assignment.submissionStatus === 'pending' && <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">Submitted</span>}
                    {assignment.submissionStatus === 'unsubmitted' && <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold">Not Started</span>}
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
    <div className="px-4 py-5 md:p-8 max-w-3xl animate-fade-in">
      <Link
        href="/dashboard/training"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Training
      </Link>

      {/* Course header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        {course.category && <p className="text-xs text-brand-500 font-medium mb-1">{course.category}</p>}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
        {course.description && <p className="text-gray-400 text-sm mb-4">{course.description}</p>}

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">{pct}%</span>
        </div>
        <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-3">
          <span>{completedCount} of {totalLessons} lessons done</span>
          {requiredReads.length > 0 && (
            <span>• {completedReviewsCount} of {requiredReads.length} required reviews done</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-2">
        <div className="flex gap-6 overflow-x-auto">
          <Link
            href={`/dashboard/training/${course.id}?tab=lessons&lang=${lang}`}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              tab === 'lessons' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lessons
          </Link>
          {showContentTabs && (
            <>
              <Link
                href={`/dashboard/training/${course.id}?tab=faqs&lang=${lang}`}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  tab === 'faqs' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                FAQs
              </Link>
              <Link
                href={`/dashboard/training/${course.id}?tab=scripts&lang=${lang}`}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  tab === 'scripts' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Scripts
              </Link>
              <Link
                href={`/dashboard/training/${course.id}?tab=objections&lang=${lang}`}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  tab === 'objections' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Objections
              </Link>
              <Link
                href={`/dashboard/training/${course.id}?tab=assignments&lang=${lang}`}
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
      {tabContent}
    </div>
  )
}
