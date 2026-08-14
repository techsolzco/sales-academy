import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuizTaker } from '@/components/quiz/QuizTaker'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function QuizStudentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', params.id).single()
  if (!quiz) return <div>Quiz not found</div>

  const { data: questions } = await supabase.from('quiz_questions').select('*').eq('quiz_id', params.id).order('order_index')
  const questionIds = questions?.map(q => q.id) || []
  let options = []
  if (questionIds.length > 0) {
    const { data: opts } = await supabase.from('quiz_options').select('*').in('question_id', questionIds).order('order_index')
    options = opts || []
  }

  const fullQuiz = {
    ...quiz,
    questions: questions?.map(q => ({
      ...q,
      options: options.filter(o => o.question_id === q.id)
    })) || []
  }

  const { data: attempts } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', params.id).eq('user_id', user.id).order('completed_at', { ascending: false })
  const latestAttempt = attempts?.[0]

  // Allow passing retake in url maybe, or just render QuizTaker if they choose to retake
  // For now, if they have a latest attempt, show it, else show taker
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard/training" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Exit Quiz
          </Link>
          <div className="font-bold text-gray-900">{quiz.title}</div>
          <div className="w-20" /> {/* Balancer */}
        </div>
      </div>

      <div className="py-8">
        <QuizTaker quiz={fullQuiz} />
      </div>
    </div>
  )
}
