import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { SalesmanScriptViewer } from '@/components/training/SalesmanScriptViewer'
import { getReviewedKbItems } from '@/lib/actions/kb-reviews'

export default async function SalesmanScriptsPage({
  searchParams,
}: {
  searchParams: { tool?: string }
}) {
  const supabase = await createClient()
  const { userId } = await getEffectiveUser()

  const [scriptsRes, toolsRes] = await Promise.all([
    supabase
      .from('scripts')
      .select('*').is('deleted_at', null)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    supabase
      .from('tools')
      .select('id, name').is('deleted_at', null)
      .eq('status', 'published')
      .order('name')
  ])
  const scripts = scriptsRes.data ?? []
  const tools = toolsRes.data ?? []

  const reviewedItems = await getReviewedKbItems('script')

  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sales Scripts & Message Templates</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ready-to-use scripts for WhatsApp, voice notes, objection responses, and closing lines. Click &ldquo;Copy Script&rdquo; to paste directly.
        </p>
      </div>

      <SalesmanScriptViewer scripts={scripts} tools={tools} initialReviewed={reviewedItems} initialToolId={searchParams.tool} />
    </div>
  )
}
