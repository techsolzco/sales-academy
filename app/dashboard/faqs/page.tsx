import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { SalesmanFAQViewer } from '@/components/training/SalesmanFAQViewer'
import { getReviewedKbItems } from '@/lib/actions/kb-reviews'

export default async function SalesmanFAQsPage({
  searchParams,
}: {
  searchParams: { tool?: string }
}) {
  const supabase = await createClient()
  const { userId } = await getEffectiveUser()

  const [faqsRes, toolsRes] = await Promise.all([
    supabase
      .from('faqs')
      .select('*').is('deleted_at', null)
      .eq('status', 'published')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('tools')
      .select('id, name').is('deleted_at', null)
      .eq('status', 'published')
      .order('name')
  ])
  const faqs = faqsRes.data ?? []
  const tools = toolsRes.data ?? []

  const reviewedItems = await getReviewedKbItems('faq')

  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Knowledge Base — FAQs</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Quickly find answers to common customer questions. Use &ldquo;Copy Answer&rdquo; to send responses directly to clients.
        </p>
      </div>

      <SalesmanFAQViewer faqs={faqs} tools={tools} initialReviewed={reviewedItems} initialToolId={searchParams.tool} />
    </div>
  )
}
