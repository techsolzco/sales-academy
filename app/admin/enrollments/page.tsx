import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EnrollmentManager } from '@/components/admin/EnrollmentManager'

export default async function EnrollmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: applications } = await supabase
    .from('enrollment_applications')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-5 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Enrollments</h1>
      <EnrollmentManager initialApplications={applications || []} />
    </div>
  )
}
