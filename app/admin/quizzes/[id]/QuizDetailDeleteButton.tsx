'use client'

import { useRouter } from 'next/navigation'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteQuiz } from '@/lib/actions/quizzes'

export function QuizDetailDeleteButton({ quizId }: { quizId: string }) {
  const router = useRouter()
  return (
    <DeleteButton
      size="md"
      onDelete={async () => {
        const res = await deleteQuiz(quizId)
        if (!res.error) router.push('/admin/quizzes')
        return res
      }}
      label="Delete Quiz"
    />
  )
}
