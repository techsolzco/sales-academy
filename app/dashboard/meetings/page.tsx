import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Video, Calendar } from 'lucide-react'
import { fetchMyMeetings } from '@/lib/actions/meetings'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function DashboardMeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const meetings = await fetchMyMeetings()
  
  const safeMeetings = meetings || []
  
  const now = new Date()
  const upcoming = safeMeetings.filter((m: any) => new Date(m.scheduled_at) > now)
  const recent = safeMeetings.filter((m: any) => {
    const scheduledAt = new Date(m.scheduled_at)
    const diff = now.getTime() - scheduledAt.getTime()
    return diff >= 0 && diff <= 60 * 60 * 1000 // Last hour
  })

  const getTimeBadge = (scheduled_at: string) => {
    const date = new Date(scheduled_at)
    const diff = date.getTime() - now.getTime()
    const diffMinutes = Math.floor(diff / 1000 / 60)
    
    if (diffMinutes < 0 && diffMinutes > -60) return "Live now!"
    if (diffMinutes <= -60) return "Ended"
    if (diffMinutes < 60) return `Starts in ${diffMinutes}m`
    if (diffMinutes < 24 * 60) return `Starts in ${Math.floor(diffMinutes / 60)}h`
    return `Starts in ${Math.floor(diffMinutes / (60 * 24))}d`
  }

  const renderMeetingCard = (meeting: any) => {
    const isLive = new Date(meeting.scheduled_at) <= now && (now.getTime() - new Date(meeting.scheduled_at).getTime() < 60 * 60 * 1000)
    
    return (
      <div key={meeting.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col relative overflow-hidden">
        {isLive && (
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        )}
        <div className="flex justify-between items-start mb-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            isLive ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'
          }`}>
            {getTimeBadge(meeting.scheduled_at)}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            meeting.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {meeting.visibility}
          </span>
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{meeting.title}</h3>
        {meeting.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{meeting.description}</p>
        )}
        
        <div className="text-sm font-medium text-gray-700 mb-6 flex items-center gap-2 mt-auto pt-4">
          <Calendar className="w-4 h-4 text-brand-600" />
          {new Date(meeting.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-auto border-t border-gray-100 pt-4">
          <a
            href={meeting.jitsi_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors text-sm"
          >
            <Video className="w-4 h-4" />
            Open external
          </a>
          <Link
            href={`/dashboard/meetings/${meeting.id}`}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors text-sm"
          >
            Join in App
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Meetings</h1>
        <p className="text-gray-500 mt-1">Join your scheduled sales training and syncs.</p>
      </div>

      <div className="space-y-8">
        {recent.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Live & Recent
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recent.map(renderMeetingCard)}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Meetings</h2>
          {upcoming.length === 0 ? (
            <EmptyState 
              icon={Video} 
              title="No upcoming meetings scheduled" 
              description="When admins schedule meetings with you, they will appear here." 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcoming.map(renderMeetingCard)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
