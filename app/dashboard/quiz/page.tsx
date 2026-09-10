import { createClient } from '@/lib/supabase/server'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import Link from 'next/link'
import { Brain, CheckCircle, XCircle, Clock } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function StudentQuizzesPage() {
  const supabase = await createClient()
  const { userId } = await getEffectiveUser()

  const [{ data: quizzes }, { data: attempts }] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, title, description, pass_score, created_at, tool:tools(name), lesson:lessons(title)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('quiz_attempts')
      .select('quiz_id, score, max_score, percentage, passed, completed_at')
      .eq('user_id', userId)
      .order('percentage', { ascending: false }),
  ])

  const bestAttemptFor = (quizId: string) => {
    const all = (attempts || []).filter((a: any) => a.quiz_id === quizId)
    return all.sort((a: any, b: any) => b.percentage - a.percentage)[0] ?? null
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Quizzes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Test your knowledge and track your scores.</p>
      </div>

      {(!quizzes || quizzes.length === 0) ? (
        <EmptyState
          icon={Brain}
          title="No quizzes yet"
          description="Check back soon — quizzes will appear here when your instructor creates them."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((quiz: any) => {
            const attempt = bestAttemptFor(quiz.id)
            return (
              <div
                key={quiz.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col"
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 truncate max-w-[140px]">
                      {(quiz.tool as any)?.name || (quiz.lesson as any)?.title || 'General'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      Pass: {quiz.pass_score}%
                    </span>
                  </div>
                  {attempt && (
                    attempt.passed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full flex-shrink-0">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Passed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full flex-shrink-0">
                        <XCircle className="w-3.5 h-3.5" />
                        {Math.round(attempt.percentage)}%
                      </span>
                    )
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 leading-snug">
                  {quiz.title}
                </h3>
                {quiz.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{quiz.description}</p>
                )}

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  {attempt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      Best score: {Math.round(attempt.percentage)}%
                      {attempt.passed ? ' · Passed' : ' · Not passed yet'}
                    </p>
                  )}
                  <Link
                    href={`/dashboard/quiz/${quiz.id}`}
                    className="block w-full py-2 text-center rounded-xl bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50 transition-colors"
                  >
                    {!attempt ? 'Start Quiz' : (attempt.passed ? 'Retake Quiz' : 'Try Again')}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
