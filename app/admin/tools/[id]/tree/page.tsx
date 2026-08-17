import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchToolTree } from '@/lib/actions/tool-onboard'
import { ToolTreeView } from '@/components/admin/ToolTreeView'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function ToolTreePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const result = await fetchToolTree(params.id)

  if (result.error || !result.data) {
    return (
      <div className="p-8 max-w-5xl">
        <p className="text-red-500">Tool not found or error loading data.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Tools', href: '/admin/tools' },
        { label: result.data.tool.name },
        { label: 'Content Tree' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          🌳 {result.data.tool.name} — Content Tree
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          All training content linked to this tool — course, FAQs, objections, and scripts.
        </p>
      </div>

      <ToolTreeView data={result.data} />
    </div>
  )
}
