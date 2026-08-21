import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SalesmanToolViewer } from '@/components/training/SalesmanToolViewer'

export default async function SalesmanToolsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tools } = await supabase
    .from('tools')
    .select('*').is('deleted_at', null)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sales & AI Tools Library</h1>
        <p className="text-gray-400 text-sm mt-1">
          Explore recommended AI, video, design, and automation tools to supercharge your sales workflow.
        </p>
      </div>

      <SalesmanToolViewer tools={tools ?? []} />
    </div>
  )
}
