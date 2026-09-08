import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuizTaker } from '@/components/quiz/QuizTaker'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function QuizStudentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: quiz } = await supabase
    .from('quizzes').select('*').is('deleted_at', null).eq('id', params.id).single()

  if (!quiz) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 dark:text-gray-400">Quiz not found.</p>
    </div>
  )

  const { data: questions } = await supabase.from('quiz_questions').select('*').eq('quiz_id', params.id).order('order_index')
  const questionIds = (questions || []).map((q: any) => q.id)
  let options: any[] = []
  if (questionIds.length > 0) {
    const { data: opts } = await supabase.from('quiz_options').select('*').in('question_id', questionIds).order('order_index')
    options = opts || []
  }
  const fullQuiz = {
    ...quiz,
    questions: (questions || []).map((q: any) => ({ ...q, options: options.filter((o: any) => o.question_id === q.id) })),
  }

  const { data: attempts } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', params.id).eq('user_id', user!.id).order('completed_at', { ascending: false })
  const bestAttempt = attempts?.length ? [...attempts].sort((a: any, b: any) => b.percentage - a.percentage)[0] : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard/quiz" className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Quizzes
          </Link>
          <div className="font-bold text-gray-900 dark:text-gray-100 truncate max-w-xs text-center">{quiz.title}</div>
          <div className="w-24" />
        </div>
      </div>

      {bestAttempt && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${bestAttempt.passed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'}`}>
            {bestAttempt.passed ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{bestAttempt.passed ? 'You already passed this quiz!' : 'Previous attempt — not passed yet'}</p>
              <p className="text-xs opacity-80 mt-0.5">Best score: {bestAttempt.score}/{bestAttempt.max_score} ({Math.round(bestAttempt.percentage)}%) · Pass threshold: {quiz.pass_score}%</p>
            </div>
            <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium opacity-70">
              <RotateCcw className="w-3.5 h-3.5" /> Retake below
            </span>
          </div>
        </div>
      )}

      <div className="py-8">
        <QuizTaker quiz={fullQuiz} />
      </div>
    </div>
  )
}
