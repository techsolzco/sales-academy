'use client'

import { useRouter } from 'next/navigation'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteAssignment } from '@/lib/actions/assignments'

export function AssignmentDetailDeleteButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter()
  return (
    <DeleteButton
      size="md"
      onDelete={async () => {
        const res = await deleteAssignment(assignmentId)
        if (!res.error) router.push('/admin/assignments')
        return res
      }}
      label="Delete Assignment"
    />
  )
}
