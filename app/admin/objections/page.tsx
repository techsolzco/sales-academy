import { createClient } from '@/lib/supabase/server'
import { ObjectionManager } from '@/components/admin/ObjectionManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function AdminObjectionsPage() {
  const supabase = await createClient()

  const { data: objections } = await supabase
    .from('objections')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
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

      <ObjectionManager initialObjections={objections ?? []} />
    </div>
  )
}
