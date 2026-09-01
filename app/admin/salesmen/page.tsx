import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchTeamMembers } from '@/lib/actions/users'
import { SalesmenList } from './SalesmenList'
import { CreateUserModal } from '@/components/admin/CreateUserModal'

export default async function AdminSalesmenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const salesmen = await fetchTeamMembers()

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users &amp; Team</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your team. Click &quot;View Portal&quot; to preview a student&apos;s exact dashboard experience.</p>
        </div>
        <CreateUserModal />
      </div>
      <SalesmenList salesmen={salesmen} currentUserId={user.id} />
    </div>
  )
}
