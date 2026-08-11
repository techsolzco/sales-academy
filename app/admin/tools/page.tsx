import { createClient } from '@/lib/supabase/server'
import { ToolManager } from '@/components/admin/ToolManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function AdminToolsPage() {
  const supabase = await createClient()

  const { data: tools } = await supabase
    .from('tools')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Tools Library' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales & AI Tools Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          Curated directory of AI generation tools, video software, productivity apps, and sales enablement utilities.
        </p>
      </div>

      <ToolManager initialTools={tools ?? []} />
    </div>
  )
}
