import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionReviewer } from '@/components/admin/SubmissionReviewer'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Trophy, ClipboardList } from 'lucide-react'
import AssignmentPublish from './AssignmentPublish'
import { AssignmentDetailDeleteButton } from './AssignmentDetailDeleteButton'

export const dynamic = 'force-dynamic'

export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: assignment } = await supabase.from('assignments')
    .select('*, tool:tools(name), quiz:quizzes(id, title, pass_score)')
    .is('deleted_at', null)
    .eq('id', params.id).single()

  if (!assignment) return <div>Not found</div>

  const { data: submissions } = await supabase.from('assignment_submissions')
    .select('*, profile:profiles(id,full_name,email,avatar_url)')
    .eq('assignment_id', params.id)
    .order('submitted_at', { ascending: false })

  const { data: activeUsers } = await supabase.from('profiles')
    .select('id, full_name')
    .eq('role', 'salesman')
    .eq('status', 'active')
    .order('full_name')

  // Content items (FAQs/scripts/objections this assignment covers)
  const { data: contentItems } = await supabase
    .from('assignment_content_items')
    .select('content_type, content_id, content_title')
    .eq('assignment_id', params.id)
    .order('content_type')

  const groupedContent = {
    faq: (contentItems || []).filter(i => i.content_type === 'faq'),
    script: (contentItems || []).filter(i => i.content_type === 'script'),
    objection: (contentItems || []).filter(i => i.content_type === 'objection'),
  }

  // Quiz attempts per submitter
  let quizAttemptsByUser: Record<string, { passed: boolean; percentage: number; score: number }> = {}
  if (assignment.quiz?.id && submissions && submissions.length > 0) {
    const userIds = submissions.map((s: any) => s.user_id)
    const { data: attempts } = await supabase.from('quiz_attempts')
      .select('user_id, passed, percentage, score')
      .eq('quiz_id', assignment.quiz.id)
      .in('user_id', userIds)
      .order('completed_at', { ascending: false })

    if (attempts) {
      for (const attempt of attempts) {
        if (!quizAttemptsByUser[attempt.user_id]) {
          quizAttemptsByUser[attempt.user_id] = {
            passed: attempt.passed,
            percentage: attempt.percentage,
            score: attempt.score,
          }
        }
      }
    }
  }

  const typeLabel: Record<string, string> = { faq: 'FAQs', script: 'Scripts', objection: 'Objections' }
  const typeEmoji: Record<string, string> = { faq: '❓', script: '💬', objection: '🛡️' }
  const typeHref: Record<string, (id: string) => string> = {
    faq: (id) => `/admin/faqs`,
    script: (id) => `/admin/scripts`,
    objection: (id) => `/admin/objections`,
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/assignments" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Assignments
        </Link>
        <AssignmentDetailDeleteButton assignmentId={params.id} />
      </div>

      {/* Assignment header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{assignment.title}</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          {assignment.tool && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-300 px-2.5 py-1 rounded-full">
              <BookOpen className="w-3 h-3" /> {assignment.tool.name}
            </span>
          )}
          {assignment.quiz && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-2.5 py-1 rounded-full">
              <Trophy className="w-3 h-3" /> Quiz: {assignment.quiz.title} (pass: {assignment.quiz.pass_score}%)
            </span>
          )}
          {assignment.due_date && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              <ClipboardList className="w-3 h-3" /> Due: {new Date(assignment.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {assignment.instructions}
        </div>

        {/* Content items summary */}
        {(contentItems || []).length > 0 && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Content to Cover ({(contentItems || []).length} items)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['faq', 'script', 'objection'] as const).map(type =>
                groupedContent[type].length > 0 ? (
                  <span key={type} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {typeEmoji[type]} {groupedContent[type].length} {typeLabel[type]}
                  </span>
                ) : null
              )}
            </div>
            <div className="mt-2 space-y-1">
              {(contentItems || []).map(item => (
                <p key={item.content_id} className="text-xs text-gray-500 dark:text-gray-400">
                  {typeEmoji[item.content_type]} {item.content_title}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <AssignmentPublish assignmentId={params.id} users={activeUsers || []} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Submissions ({submissions?.length || 0})
        </h2>
        {assignment.quiz && (
          <p className="text-xs text-gray-400">Quiz results shown where available</p>
        )}
      </div>

      <div className="space-y-4">
        {!submissions || submissions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed text-gray-500">
            No submissions yet.
          </div>
        ) : (
          submissions.map((sub: any) => (
            <SubmissionReviewer
              key={sub.id}
              submission={sub}
              linkedQuizResult={quizAttemptsByUser[sub.user_id] || null}
            />
          ))
        )}
      </div>
    </div>
  )
}
