import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BulkGeneratePanel } from '@/components/admin/BulkGeneratePanel'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function GenerateTrainingPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: tool } = await supabase.from('tools').select('id, name, description').is('deleted_at', null).eq('id', params.id).single()
  if (!tool) redirect('/admin/tools')

  return (
    <div className="p-8 max-w-4xl">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Tools', href: '/admin/tools' },
        { label: tool.name, href: `/admin/tools/${tool.id}` },
        { label: 'Generate Training' },
      ]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Bulk Generate: {tool.name}</h1>
        <p className="text-sm text-gray-400 mt-1">Generate a complete training package (FAQs, objections, scripts) for this tool using AI.</p>
      </div>
      <BulkGeneratePanel toolId={tool.id} toolName={tool.name} toolDescription={tool.description || ''} />
    </div>
  )
}
