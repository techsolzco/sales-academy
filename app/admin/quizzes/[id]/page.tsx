import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuizEditor } from '@/components/admin/QuizEditor'

export const dynamic = 'force-dynamic'

export default async function QuizDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', params.id).single()
  if (!quiz) return <div>Not found</div>

  const { data: lessons } = await supabase.from('lessons').select('id, title').order('order_index')

  const { data: attempts } = await supabase.from('quiz_attempts').select('*, profile:profiles(full_name)').eq('quiz_id', params.id).order('completed_at', { ascending: false })

  const totalAttempts = attempts?.length || 0
  const passCount = attempts?.filter(a => a.passed).length || 0
  const avgPercentage = totalAttempts ? Math.round(attempts!.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts) : 0
  const passRate = totalAttempts ? Math.round((passCount / totalAttempts) * 100) : 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/admin/quizzes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Quizzes
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
          <p className="text-sm font-medium text-gray-500">Total Attempts</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalAttempts}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
          <p className="text-sm font-medium text-gray-500">Average Score</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{avgPercentage}%</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
          <p className="text-sm font-medium text-gray-500">Pass Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{passRate}%</p>
        </div>
      </div>

      <QuizEditor quizId={params.id} initialData={quiz} lessons={lessons || []} />

      <div className="mt-12">
        <h2 className="text-lg font-bold mb-4">Recent Attempts</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attempts?.map(attempt => (
                <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{attempt.profile?.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{attempt.score}/{attempt.total_points} ({attempt.percentage}%)</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {attempt.passed ? 'Passed' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(attempt.completed_at).toLocaleString()}</td>
                </tr>
              ))}
              {(!attempts || attempts.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No attempts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
