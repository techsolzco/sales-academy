import { createClient } from '@/lib/supabase/server'
import { FAQManager } from '@/components/admin/FAQManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function AdminFAQsPage({
  searchParams,
}: {
  searchParams: { tool?: string }
}) {
  const supabase = await createClient()

  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: tools } = await supabase
    .from('tools')
    .select('id, name')
    .eq('status', 'published')
    .order('name')

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'FAQs' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage customer questions, quick responses, and customer-ready answers for salesmen.
        </p>
      </div>

      <FAQManager initialFaqs={faqs ?? []} tools={tools ?? []} initialToolId={searchParams.tool} />
    </div>
  )
}
