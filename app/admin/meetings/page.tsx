import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Video } from 'lucide-react'
import { fetchMeetings } from '@/lib/actions/meetings'
import { AdminMeetingCard } from '@/components/meetings/AdminMeetingCard'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function AdminMeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const meetings = await fetchMeetings()
  
  const safeMeetings = meetings || []

  const now = new Date()
  const upcoming = safeMeetings.filter((m: any) => new Date(m.scheduled_at) > now)
  const past = safeMeetings.filter((m: any) => new Date(m.scheduled_at) <= now)

  return (
    <div className="px-4 py-5 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Virtual Meetings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Schedule and manage live sessions with your sales team.</p>
        </div>
        <Link
          href="/admin/meetings/new"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </Link>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Upcoming Meetings</h2>
          {upcoming.length === 0 ? (
             <EmptyState 
                icon={Video} 
                title="No upcoming meetings" 
                description="Schedule a new meeting to get started." 
             />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map(m => (
                <AdminMeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Past Meetings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 hover:opacity-100 transition-opacity">
              {past.map(m => (
                <AdminMeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
