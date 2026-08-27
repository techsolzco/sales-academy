import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Image, Link as LinkIcon, FileText, Star, Trophy } from 'lucide-react'
import { AssignmentSubmitForm } from '@/components/assignments/AssignmentSubmitForm'

export const dynamic = 'force-dynamic'

export default async function AssignmentStudentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: assignment } = await supabase
    .from('assignments')
    .select('*, tool:tools(name), quiz:quizzes(id, title, pass_score)')
    .is('deleted_at', null)
    .eq('id', params.id)
    .single()

  if (!assignment) return <div>Not found</div>

  const { data: submission } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('assignment_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  // If quiz attached, fetch this user's latest attempt
  let quizAttempt: { passed: boolean; percentage: number; score: number } | null = null
  if (assignment.quiz?.id) {
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('passed, percentage, score')
      .eq('quiz_id', assignment.quiz.id)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (attempt) quizAttempt = attempt
  }

  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/assignments" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-6 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Assignments
      </Link>

      {/* Assignment card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{assignment.title}</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          {assignment.tool && (
            <span className="text-xs font-medium text-brand-700 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-300 px-2.5 py-1 rounded-full">
              {assignment.tool.name}
            </span>
          )}
          {assignment.due_date && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              Due {new Date(assignment.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
          {assignment.instructions}
        </div>
      </div>

      {/* Linked quiz — show status */}
      {assignment.quiz && (
        <div className={`mb-6 p-4 rounded-2xl border ${quizAttempt?.passed ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : quizAttempt ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className={`w-5 h-5 ${quizAttempt?.passed ? 'text-green-600' : quizAttempt ? 'text-red-600' : 'text-purple-600'}`} />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{assignment.quiz.title}</p>
                <p className="text-xs text-gray-500">Required quiz · Pass score: {assignment.quiz.pass_score}%</p>
              </div>
            </div>
            {quizAttempt ? (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${quizAttempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {quizAttempt.passed ? '✓ Passed' : '✗ Failed'} ({quizAttempt.percentage}%)
              </span>
            ) : (
              <Link
                href={`/dashboard/quiz/${assignment.quiz.id}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Take Quiz
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Submission view or form */}
      {submission ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Your Submission</h2>
            <div className="flex items-center gap-2">
              {submission.score != null && (
                <span className="flex items-center gap-1 text-xs font-bold text-brand-700 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-300 px-2.5 py-1 rounded-full">
                  <Star className="w-3 h-3" /> {submission.score}/100
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColors[submission.status] || 'bg-gray-100 text-gray-600'}`}>
                {submission.status}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Text response */}
            {submission.response_text && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Written Response</p>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {submission.response_text}
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="flex flex-wrap gap-2">
              {submission.image_url && (
                <a
                  href={submission.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition-colors"
                >
                  <Image className="w-4 h-4" /> View Photo
                </a>
              )}
              {submission.media_link && (
                <a
                  href={submission.media_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-medium transition-colors"
                >
                  <LinkIcon className="w-4 h-4" /> Open Media Link
                </a>
              )}
              {submission.file_url && (
                <a
                  href={submission.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" /> File Attachment
                </a>
              )}
            </div>

            {/* Feedback */}
            {submission.feedback && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Instructor Feedback</p>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 p-4 rounded-xl text-sm whitespace-pre-wrap border border-blue-100 dark:border-blue-800">
                  {submission.feedback}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <AssignmentSubmitForm assignmentId={assignment.id} assignmentTitle={assignment.title} />
      )}
    </div>
  )
}
