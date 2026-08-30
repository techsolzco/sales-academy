'use client'

import { useRouter } from 'next/navigation'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteQuiz } from '@/lib/actions/quizzes'

export function QuizDeleteButton({ quizId }: { quizId: string }) {
  const router = useRouter()
  return (
    <DeleteButton
      onDelete={async () => {
        const res = await deleteQuiz(quizId)
        if (!res.error) router.refresh()
        return res
      }}
      label="Delete Quiz"
    />
  )
}
