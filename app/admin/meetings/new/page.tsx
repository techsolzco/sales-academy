import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MeetingForm } from '@/components/admin/MeetingForm'
import { fetchSalesmen } from '@/lib/actions/meetings'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function NewMeetingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const courses = await supabase.from('courses').select('id, title').is('deleted_at', null).order('title').then(r => r.data ?? [])
  const salesmen = await fetchSalesmen()

  return (
    <div className="px-4 py-5 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/meetings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Schedule New Meeting</h1>
        <p className="text-gray-500 mt-1">Create a Jitsi video meeting and invite your sales team.</p>
      </div>

      <MeetingForm courses={(courses || []) as any[]} salesmen={salesmen || []} />
    </div>
  )
}
