import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Video, Users } from 'lucide-react'
import { fetchMeeting, fetchMeetingAttendance, fetchMeetingNotes, fetchActionItems } from '@/lib/actions/meetings'
import { CopyLinkButton } from '@/components/meetings/CopyLinkButton'
import { DeleteMeetingButton } from '@/components/meetings/DeleteMeetingButton'
import { AttendanceManager } from '@/components/meetings/AttendanceManager'
import { MeetingNotes } from '@/components/meetings/MeetingNotes'

export const dynamic = 'force-dynamic'

export default async function AdminMeetingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const meeting = await fetchMeeting(params.id)

  const [attendanceRows, notes, actionItems] = await Promise.all([
    fetchMeetingAttendance(params.id),
    fetchMeetingNotes(params.id),
    fetchActionItems(params.id),
  ])
  if (!meeting) {
    return (
      <div className="px-4 py-5 md:p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Meeting not found</h2>
        <Link href="/admin/meetings" className="text-brand-600 mt-4 inline-block hover:underline">
          Return to Meetings
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/admin/meetings" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{meeting.title}</h1>
            {meeting.course?.title && (
              <p className="text-brand-600 font-medium mt-1">Linked to: {meeting.course.title}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            meeting.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {meeting.visibility}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-700">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <span className="font-medium text-lg">
                {new Date(meeting.scheduled_at).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
              </span>
            </div>
            {meeting.description && (
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl">{meeting.description}</p>
            )}
          </div>
          
          <div className="flex flex-col gap-3 min-w-[200px]">
            <a
              href={meeting.jitsi_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-sm"
            >
              <Video className="w-5 h-5" />
              Join Meeting
            </a>
            <CopyLinkButton url={meeting.jitsi_url} label="Copy Meeting Link" />
            <DeleteMeetingButton meetingId={meeting.id} meetingTitle={meeting.title} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              Invitees ({meeting.invitees?.length || 0})
            </h2>
          </div>

          {attendanceRows.length > 0 ? (
            <AttendanceManager meetingId={meeting.id} rows={attendanceRows} />
          ) : meeting.visibility === 'public' ? (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <Users className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">This is a public meeting. Anyone with the link can join, so there is no specific invitee list.</p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No specific invitees for this meeting.</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
        <MeetingNotes
          meetingId={meeting.id}
          notes={notes}
          actionItems={actionItems}
          isAdmin
          currentUserId={user.id}
          assignees={attendanceRows.map(r => ({ id: r.user_id, full_name: r.full_name }))}
        />
      </div>
    </div>
  )
}
