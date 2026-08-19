import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SalesmanScriptViewer } from '@/components/training/SalesmanScriptViewer'
import { getReviewedKbItems } from '@/lib/actions/kb-reviews'

export default async function SalesmanScriptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [scriptsRes, toolsRes] = await Promise.all([
    supabase
      .from('scripts')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    supabase
      .from('tools')
      .select('id, name')
      .eq('status', 'published')
      .order('name')
  ])
  const scripts = scriptsRes.data ?? []
  const tools = toolsRes.data ?? []

  const reviewedItems = await getReviewedKbItems('script')

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sales Scripts & Message Templates</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ready-to-use scripts for WhatsApp, voice notes, objection responses, and closing lines. Click &ldquo;Copy Script&rdquo; to paste directly.
        </p>
      </div>

      <SalesmanScriptViewer scripts={scripts} tools={tools} initialReviewed={reviewedItems} />
    </div>
  )
}
