import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionReviewer } from '@/components/admin/SubmissionReviewer'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Trophy, ClipboardList } from 'lucide-react'
import AssignmentPublish from './AssignmentPublish'

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

  // If assignment has a linked quiz, fetch attempt results for each submitter
  let quizAttemptsByUser: Record<string, { passed: boolean; percentage: number; score: number }> = {}
  if (assignment.quiz?.id && submissions && submissions.length > 0) {
    const userIds = submissions.map((s: any) => s.user_id)
    const { data: attempts } = await supabase.from('quiz_attempts')
      .select('user_id, passed, percentage, score')
      .eq('quiz_id', assignment.quiz.id)
      .in('user_id', userIds)
      .order('completed_at', { ascending: false })

    // Take the latest attempt per user
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

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl mx-auto">
      <Link href="/admin/assignments" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-6 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Assignments
      </Link>

      {/* Assignment header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{assignment.title}</h1>
            <div className="flex flex-wrap gap-3 mt-2">
              {assignment.tool && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-300 px-2.5 py-1 rounded-full">
                  <BookOpen className="w-3 h-3" /> {assignment.tool.name}
                </span>
              )}
              {assignment.quiz && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-2.5 py-1 rounded-full">
                  <Trophy className="w-3 h-3" /> Quiz: {assignment.quiz.title}
                </span>
              )}
              {assignment.due_date && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  <ClipboardList className="w-3 h-3" /> Due: {new Date(assignment.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {assignment.instructions}
        </div>
      </div>

      {/* Publish / assign section */}
      <AssignmentPublish assignmentId={params.id} users={activeUsers || []} />

      {/* Submissions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Submissions ({submissions?.length || 0})
        </h2>
        {assignment.quiz && (
          <p className="text-xs text-gray-400">
            Quiz results shown where available
          </p>
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
