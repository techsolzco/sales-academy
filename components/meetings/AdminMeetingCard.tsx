'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Users, Eye, Trash2 } from 'lucide-react'
import { CopyLinkButton } from '@/components/meetings/CopyLinkButton'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { deleteMeeting } from '@/lib/actions/meetings'

interface AdminMeetingCardProps {
  meeting: {
    id: string
    title: string
    visibility: string
    jitsi_url: string
    scheduled_at: string
    invitees?: any[]
    invitee_count?: number
    course?: { id: string; name?: string; title?: string } | null
  }
  onDeleted?: (id: string) => void
}

export function AdminMeetingCard({ meeting, onDeleted }: AdminMeetingCardProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const inviteeCount = meeting.invitees?.length ?? meeting.invitee_count ?? 0
  const courseTitle = meeting.course?.title || meeting.course?.name

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await deleteMeeting(meeting.id)
      if (res.error) {
        setDeleteError(res.error)
        setIsDeleting(false)
        return
      }
      setIsDeleting(false)
      setIsModalOpen(false)
      if (onDeleted) {
        onDeleted(meeting.id)
      }
      router.refresh()
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete meeting')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            meeting.visibility === 'public' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          }`}>
            {meeting.visibility}
          </span>
          <div className="flex items-center gap-2">
            <CopyLinkButton url={meeting.jitsi_url} label="Copy" />
            <button
              onClick={() => {
                setDeleteError(null)
                setIsModalOpen(true)
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              title="Delete Meeting"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">{meeting.title}</h3>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {new Date(meeting.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {inviteeCount} Invitees
          </div>
          {courseTitle && (
            <div className="text-gray-400 dark:text-gray-500 truncate max-w-[150px]" title={courseTitle}>
              • {courseTitle}
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <Link
            href={`/admin/meetings/${meeting.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <Eye className="w-4 h-4" />
            View Details
          </Link>
          <button
            onClick={() => {
              setDeleteError(null)
              setIsModalOpen(true)
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
            title="Delete Meeting"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title="Delete Meeting"
        message="Are you sure? This cannot be undone."
        itemTitle={meeting.title}
        isDeleting={isDeleting}
        error={deleteError}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => {
          if (!isDeleting) {
            setIsModalOpen(false)
            setDeleteError(null)
          }
        }}
      />
    </>
  )
}
