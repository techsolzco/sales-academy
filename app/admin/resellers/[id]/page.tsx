import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchCommissions } from '@/lib/actions/reseller'
import { CommissionManager } from '@/components/admin/CommissionManager'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Link as LinkIcon } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export default async function ResellerDetailsPage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!profile) {
    return <div className="px-4 py-5 md:p-8">Reseller not found</div>
  }

  const commissions = await fetchCommissions(params.id)

  async function updateSalesUrl(formData: FormData) {
    'use server'
    const url = formData.get('sales_url') as string
    const supabaseServer = await createClient()
    await supabaseServer
      .from('profiles')
      .update({ sales_portal_url: url })
      .eq('id', params.id)
    revalidatePath(`/admin/resellers/${params.id}`)
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/admin/resellers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition mb-2">
        <ArrowLeft className="w-4 h-4" /> Back to Resellers
      </Link>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-2xl">
            {profile.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 min-w-[300px]">
          <form action={updateSalesUrl} className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                name="sales_url"
                defaultValue={profile.sales_portal_url || ''}
                placeholder="Sales Portal URL"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition">
              Save
            </button>
          </form>
          {profile.sales_portal_url && (
            <a href={profile.sales_portal_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
              <ExternalLink className="w-3.5 h-3.5" /> Test Link
            </a>
          )}
        </div>
      </div>

      <CommissionManager 
        resellerId={profile.id}
        resellerName={profile.full_name || 'User'}
        commissions={commissions}
      />
    </div>
  )
}
