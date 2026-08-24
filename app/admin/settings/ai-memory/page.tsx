import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AiMemoryView } from '@/components/admin/AiMemoryView'

export const dynamic = 'force-dynamic'

export default async function AiMemoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, description, pricing, status, knowledge_summary, knowledge_summary_source, knowledge_summary_updated_at')
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Memory</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          What Ask AI currently knows about each tool. Click any tool to view, edit, or regenerate its knowledge summary.
        </p>
      </div>
      <AiMemoryView tools={tools ?? []} />
    </div>
  )
}
