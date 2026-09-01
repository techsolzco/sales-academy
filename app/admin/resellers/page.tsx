import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchResellers } from '@/lib/actions/reseller'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function ResellersPage() {
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

  const resellers = await fetchResellers()

  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Partners</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Manage approved resellers and their commissions.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resellers.map(reseller => (
          <Link href={`/admin/resellers/${reseller.id}`} key={reseller.id} className="block group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-lg">
                    {reseller.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 transition">{reseller.full_name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{reseller.email}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Paid</p>
                  <p className="text-lg font-semibold text-green-600">${reseller.total_paid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Pending</p>
                  <p className="text-lg font-semibold text-amber-500">${reseller.total_pending.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {resellers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">No active sales partners found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
