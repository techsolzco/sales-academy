import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SalesmanFAQViewer } from '@/components/training/SalesmanFAQViewer'

export default async function SalesmanFAQsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .eq('status', 'published')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base — FAQs</h1>
        <p className="text-gray-400 text-sm mt-1">
          Quickly find answers to common customer questions. Use &ldquo;Copy Answer&rdquo; to send responses directly to clients.
        </p>
      </div>

      <SalesmanFAQViewer faqs={faqs ?? []} />
    </div>
  )
}
