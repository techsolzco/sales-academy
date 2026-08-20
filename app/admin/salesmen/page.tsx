import { fetchActiveSalesmen } from '@/lib/actions/view-as-student'
import { SalesmenList } from './SalesmenList'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminSalesmenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const salesmen = await fetchActiveSalesmen()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Salesmen</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your sales team. Click "View Portal" to preview a student's exact dashboard experience.</p>
      </div>
      <SalesmenList salesmen={salesmen} />
    </div>
  )
}
