import { createClient } from '@/lib/supabase/server'
import { ToolManager } from '@/components/admin/ToolManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import Link from 'next/link'

export default async function AdminToolsPage() {
  const supabase = await createClient()

  const { data: tools } = await supabase
    .from('tools')
    .select('*').is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Tools Library' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales & AI Tools Library</h1>
          <p className="text-sm text-gray-400 mt-1">
            Curated directory of AI generation tools, video software, productivity apps, and sales enablement utilities.
          </p>
        </div>
        <Link
          href="/admin/tools/onboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow-sm flex-shrink-0"
        >
          🌳 Onboard New Tool
        </Link>
      </div>

      <ToolManager initialTools={tools ?? []} />
    </div>
  )
}

