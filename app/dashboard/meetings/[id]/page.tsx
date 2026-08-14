import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Calendar } from 'lucide-react'
import { fetchMeeting } from '@/lib/actions/meetings'
import { CopyLinkButton } from '@/components/meetings/CopyLinkButton'
import { JitsiEmbed } from '@/components/meetings/JitsiEmbed'

export const dynamic = 'force-dynamic'

export default async function DashboardMeetingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const meeting = await fetchMeeting(params.id)
  
  if (!meeting) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Meeting not found</h2>
        <Link href="/dashboard/meetings" className="text-brand-600 mt-4 inline-block hover:underline">
          Return to Meetings
        </Link>
      </div>
    )
  }

  const isInvited = meeting.visibility === 'public' || meeting.invitees?.some((i: any) => i.user_id === user.id)
  
  if (!isInvited) {
    redirect('/dashboard/meetings')
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 flex flex-col h-[calc(100vh-4rem)]">
      <div>
        <Link href="/dashboard/meetings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(meeting.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            {meeting.description && (
              <p className="text-gray-600 mt-3 max-w-2xl text-sm">{meeting.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <CopyLinkButton url={meeting.jitsi_url} label="Copy Link" />
            <a
              href={meeting.jitsi_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden relative min-h-[500px]">
        <JitsiEmbed url={meeting.jitsi_url} />
      </div>
      <p className="text-center text-sm text-gray-500 pb-8">
        If the embed doesn't load or your browser blocks permissions, <a href={meeting.jitsi_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">open in a new tab</a>.
      </p>
    </div>
  )
}
