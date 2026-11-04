'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { deleteMeeting } from '@/lib/actions/meetings'

interface DeleteMeetingButtonProps {
  meetingId: string
  meetingTitle: string
}

export function DeleteMeetingButton({ meetingId, meetingTitle }: DeleteMeetingButtonProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await deleteMeeting(meetingId)
      if (res.error) {
        setDeleteError(res.error)
        setIsDeleting(false)
        return
      }
      setIsDeleting(false)
      setIsModalOpen(false)
      router.push('/admin/meetings')
      router.refresh()
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete meeting')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setDeleteError(null)
          setIsModalOpen(true)
        }}
        className="flex items-center justify-center gap-2 w-full bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm"
      >
        <Trash2 className="w-5 h-5" />
        Delete Meeting
      </button>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title="Delete Meeting"
        message="Are you sure? This cannot be undone."
        itemTitle={meetingTitle}
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
