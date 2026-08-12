import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchResellerApplications } from '@/lib/actions/reseller'
import { ResellerApplicationManager } from '@/components/admin/ResellerApplicationManager'

export default async function ResellerRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const applications = await fetchResellerApplications()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reseller Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage partner applications from salesmen.</p>
      </div>
      
      <ResellerApplicationManager initialApplications={applications} />
    </div>
  )
}
