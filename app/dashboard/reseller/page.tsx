import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchCommissions, fetchMyResellerApplication } from '@/lib/actions/reseller'
import { CommissionLedger } from '@/components/reseller/CommissionLedger'
import { ExternalLink, Rocket } from 'lucide-react'
import Link from 'next/link'

export default async function SalesPartnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_reseller) {
    redirect('/dashboard')
  }

  const commissions = await fetchCommissions()
  const application = await fetchMyResellerApplication()

  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Partner Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Track your commissions and manage your sales portal.</p>
      </div>

      {profile.sales_portal_url ? (
        <a 
          href={profile.sales_portal_url} 
          target="_blank" 
          rel="noreferrer"
          className="block group bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl shadow-md p-8 hover:shadow-lg transition relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">🔗 Open My Sales Portal</h2>
              <p className="text-brand-100 font-medium">Access your personal reseller system and promotional tools.</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
          </div>
        </a>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Rocket className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sales Portal Pending</h2>
          <p className="text-gray-500 max-w-md mx-auto">Your partner account is approved, but your personal sales portal link has not been assigned yet. Please contact your administrator.</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Commission History</h2>
        <CommissionLedger 
          commissions={commissions} 
          totalPaid={totalPaid} 
          totalPending={totalPending} 
        />
      </div>
    </div>
  )
}
