import { createClient } from '@/lib/supabase/server'
import { ScriptManager } from '@/components/admin/ScriptManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function AdminScriptsPage({
  searchParams,
}: {
  searchParams: { tool?: string }
}) {
  const supabase = await createClient()

  const [scriptsRes, copiesRes, toolsRes] = await Promise.all([
    supabase
      .from('scripts')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('script_copies')
      .select('script_id'),
      
    supabase
      .from('tools')
      .select('id, name')
      .eq('status', 'published')
      .order('name'),
  ])

  const tools = toolsRes.data ?? []

  const copyCounts: Record<string, number> = {}
  for (const row of copiesRes.data ?? []) {
    copyCounts[row.script_id] = (copyCounts[row.script_id] ?? 0) + 1
  }

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Sales Scripts' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Scripts Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          Word-for-word pitch scripts, objection handling templates, WhatsApp greetings, and closing lines for salesmen.
        </p>
      </div>

      <ScriptManager 
        initialScripts={scriptsRes.data ?? []} 
        copyCounts={copyCounts} 
        tools={tools} 
        initialToolId={searchParams.tool} 
      />
    </div>
  )
}
