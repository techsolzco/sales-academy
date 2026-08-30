import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuizEditor } from '@/components/admin/QuizEditor'
import { QuizDetailDeleteButton } from './QuizDetailDeleteButton'

export const dynamic = 'force-dynamic'

export default async function QuizDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch quiz WITH nested questions+options+tool
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      tool:tools(id, name),
      questions:quiz_questions(
        *,
        options:quiz_options(*)
      )
    `)
    .is('deleted_at', null)
    .eq('id', params.id)
    .single()

  if (!quiz) return <div className="p-8 text-gray-500">Quiz not found</div>

  // Sort questions and options
  const questions = (quiz.questions || [])
    .map((q: any) => ({ ...q, options: [...(q.options || [])].sort((a: any, b: any) => a.order_index - b.order_index) }))
    .sort((a: any, b: any) => a.order_index - b.order_index)

  const [{ data: lessons }, { data: tools }, { data: attempts }] = await Promise.all([
    supabase.from('lessons').select('id, title').is('deleted_at', null).order('order_index'),
    supabase.from('tools').select('id, name').is('deleted_at', null).eq('status', 'published').order('name'),
    supabase.from('quiz_attempts')
      .select('*, profile:profiles(full_name)')
      .eq('quiz_id', params.id)
      .order('completed_at', { ascending: false }),
  ])

  const totalAttempts = attempts?.length || 0
  const passCount = attempts?.filter((a: any) => a.passed).length || 0
  const avgPercentage = totalAttempts
    ? Math.round(attempts!.reduce((acc: number, a: any) => acc + a.percentage, 0) / totalAttempts)
    : 0
  const passRate = totalAttempts ? Math.round((passCount / totalAttempts) * 100) : 0

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/quizzes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Quizzes
        </Link>
        <QuizDetailDeleteButton quizId={params.id} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Attempts', value: totalAttempts },
          { label: 'Average Score', value: `${avgPercentage}%` },
          { label: 'Pass Rate', value: `${passRate}%` },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <QuizEditor
        quizId={params.id}
        initialData={{ ...quiz, questions }}
        lessons={lessons || []}
        tools={tools || []}
      />

      {/* Recent attempts table */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Recent Attempts</h2>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {['Student', 'Score', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {attempts?.map((attempt: any) => (
                  <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100 text-sm">{attempt.profile?.full_name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{attempt.score}/{attempt.max_score} ({Math.round(attempt.percentage)}%)</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">{new Date(attempt.completed_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(!attempts || attempts.length === 0) && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500 text-sm">No attempts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
