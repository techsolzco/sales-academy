import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssignmentEditor } from '@/components/admin/AssignmentEditor'

export const dynamic = 'force-dynamic'

export default async function NewAssignmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tools } = await supabase
    .from('tools').select('id, name').is('deleted_at', null).order('name')

  const { data: quizzes } = await supabase
    .from('quizzes').select('id, title, tool_id').is('deleted_at', null).order('title')

  return (
    <AssignmentEditor
      tools={tools || []}
      quizzes={(quizzes || []) as any}
    />
  )
}
