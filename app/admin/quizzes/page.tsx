import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Brain } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function QuizzesAdminPage({
  searchParams
}: {
  searchParams: { tool?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let query = supabase.from('quizzes').select('*, lesson:lessons(title)').order('created_at', { ascending: false })
  if (searchParams.tool) {
    query = query.eq('tool_id', searchParams.tool)
  }
  const { data: quizzes } = await query

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-500 mt-1">Manage quizzes and view attempts.</p>
        </div>
        <Link
          href="/admin/quizzes/new"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Quiz
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quiz</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lesson</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pass Score</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(!quizzes || quizzes.length === 0) ? (
              <tr>
                <td colSpan={4} className="p-8">
                  <EmptyState 
                    icon={Brain} 
                    title="No quizzes created yet" 
                    description="Create quizzes to test your team's knowledge." 
                  />
                </td>
              </tr>
            ) : (
              quizzes.map((quiz: any) => (
                <tr key={quiz.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <Link href={`/admin/quizzes/${quiz.id}`} className="font-medium text-gray-900 block hover:text-brand-600">
                      {quiz.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {quiz.lesson?.title || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {quiz.pass_score}%
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(quiz.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
