'use client'

import { useRouter } from 'next/navigation'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteAssignment } from '@/lib/actions/assignments'

export function AssignmentDeleteButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter()
  return (
    <DeleteButton
      onDelete={async () => {
        const res = await deleteAssignment(assignmentId)
        if (!res.error) router.refresh()
        return res
      }}
      label="Delete Assignment"
    />
  )
}
