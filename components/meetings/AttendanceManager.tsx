'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markAttendance, type AttendanceStatus, type MeetingAttendanceRow } from '@/lib/actions/meetings'

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  pending: 'Pending',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
}

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const BUTTON_STYLE: Record<Exclude<AttendanceStatus, 'pending'>, string> = {
  present: 'hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-900/30',
  absent: 'hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-900/30',
  late: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 dark:hover:bg-amber-900/30',
}

export function AttendanceManager({
  meetingId,
  rows,
}: {
  meetingId: string
  rows: MeetingAttendanceRow[]
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleMark(userId: string, status: AttendanceStatus) {
    setBusyId(userId)
    setError(null)
    try {
      const res = await markAttendance(meetingId, userId, status)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch (e: any) {
      setError(e.message || 'Failed to mark attendance')
    } finally {
      setBusyId(null)
    }
  }

  if (rows.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">No specific invitees for this meeting.</p>
  }

  const marked = rows.filter(r => r.attendance !== 'pending').length

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {marked} of {rows.length} marked
      </p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-2 mb-4">{error}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map(row => (
          <div key={row.user_id} className="flex flex-col gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              {row.avatar_url ? (
                <img src={row.avatar_url} alt={row.full_name ?? ''} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                  {row.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{row.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.email}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[row.attendance]}`}>
                {STATUS_LABEL[row.attendance]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(['present', 'absent', 'late'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={busyId === row.user_id || row.attendance === status}
                  onClick={() => handleMark(row.user_id, status)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-40 disabled:cursor-default ${
                    row.attendance === status
                      ? STATUS_BADGE[status] + ' border-transparent'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 ' + BUTTON_STYLE[status]
                  }`}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
            {row.attendance_marked_at && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Marked {new Date(row.attendance_marked_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
