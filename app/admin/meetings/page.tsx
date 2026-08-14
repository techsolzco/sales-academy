import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Video, Calendar, Users, Eye } from 'lucide-react'
import { fetchMeetings } from '@/lib/actions/meetings'
import { CopyLinkButton } from '@/components/meetings/CopyLinkButton'
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

  const renderMeetingCard = (meeting: any) => (
    <div key={meeting.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
          meeting.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {meeting.visibility}
        </span>
        <div className="flex items-center gap-2">
          <CopyLinkButton url={meeting.jitsi_url} label="Copy" />
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{meeting.title}</h3>
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        {new Date(meeting.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {meeting.invitees?.length || 0} Invitees
        </div>
        {meeting.course?.title && (
          <div className="text-gray-400 truncate max-w-[150px]" title={meeting.course.title}>
            • {meeting.course.title}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <Link href={`/admin/meetings/${meeting.id}`} className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors">
          <Eye className="w-4 h-4" />
          View Details
        </Link>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Meetings</h1>
          <p className="text-gray-500 mt-1">Schedule and manage live sessions with your sales team.</p>
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
          <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Meetings</h2>
          {upcoming.length === 0 ? (
             <EmptyState 
                icon={Video} 
                title="No upcoming meetings" 
                description="Schedule a new meeting to get started." 
             />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map(renderMeetingCard)}
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Past Meetings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 hover:opacity-100 transition-opacity">
              {past.map(renderMeetingCard)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
