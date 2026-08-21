import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuizEditor } from '@/components/admin/QuizEditor'

export const dynamic = 'force-dynamic'

export default async function NewQuizPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: lessons } = await supabase.from('lessons').select('id, title').is('deleted_at', null).order('order_index')

  return <QuizEditor quizId={null} lessons={lessons || []} />
}
