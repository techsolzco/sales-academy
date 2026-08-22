import { createClient } from '@/lib/supabase/server'
import { ObjectionManager } from '@/components/admin/ObjectionManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function AdminObjectionsPage({
  searchParams,
}: {
  searchParams: { tool?: string }
}) {
  const supabase = await createClient()

  const [objectionsRes, toolsRes] = await Promise.all([
    supabase
      .from('objections')
      .select('*').is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('tools')
      .select('id, name').is('deleted_at', null)
      .eq('status', 'published')
      .order('name')
  ])

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Objection Handling' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Objection Handling Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          Arm your sales team with exact recommended responses and clear &ldquo;Do Not Say&rdquo; warnings for common customer objections.
        </p>
      </div>

      <ObjectionManager 
        initialObjections={objectionsRes.data ?? []} 
        tools={toolsRes.data ?? []} 
        initialToolId={searchParams.tool}
      />
    </div>
  )
}
