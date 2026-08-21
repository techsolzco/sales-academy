import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssignmentEditor } from '@/components/admin/AssignmentEditor'

export const dynamic = 'force-dynamic'

export default async function NewAssignmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: courses } = await supabase.from('courses').select('id, title').is('deleted_at', null).order('title')
  const { data: lessons } = await supabase.from('lessons').select('id, title, module_id').is('deleted_at', null).order('order_index')

  return <AssignmentEditor courses={courses || []} lessons={lessons || []} />
}
