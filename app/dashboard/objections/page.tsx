import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SalesmanObjectionViewer } from '@/components/training/SalesmanObjectionViewer'
import { getReviewedKbItems } from '@/lib/actions/kb-reviews'

export default async function SalesmanObjectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: objections } = await supabase
    .from('objections')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  const reviewedItems = await getReviewedKbItems('objection')

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Objection Handling Playbook</h1>
        <p className="text-gray-400 text-sm mt-1">
          Learn how to turn common customer doubts into closed deals. Study the recommended responses and avoid common pitfalls.
        </p>
      </div>

      <SalesmanObjectionViewer objections={objections ?? []} initialReviewed={reviewedItems} />
    </div>
  )
}
