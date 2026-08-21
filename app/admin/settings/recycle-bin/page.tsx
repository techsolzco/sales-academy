import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchTrashedItems } from '@/lib/actions/recycle-bin'
import { RecycleBin } from '@/components/admin/RecycleBin'

export default async function RecycleBinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin')

  const trashedItems = await fetchTrashedItems()

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recycle Bin</h1>
        <p className="text-gray-400 text-sm mt-1">
          Restore or permanently delete soft-deleted content. Items here are hidden from all users but not yet removed from the database.
        </p>
      </div>
      <RecycleBin initialData={trashedItems} />
    </div>
  )
}
