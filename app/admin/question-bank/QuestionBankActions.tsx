'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteBankQuestion, importBankQuestionIntoQuiz } from '@/lib/actions/question-bank'

export function BankQuestionDeleteButton({ questionId }: { questionId: string }) {
  const router = useRouter()
  return (
    <DeleteButton
      onDelete={async () => {
        const res = await deleteBankQuestion(questionId)
        if (!res.error) router.refresh()
        return res
      }}
      label="Delete bank question"
    />
  )
}

interface QuizOption {
  id: string
  title: string
}

export function AddToQuizPicker({
  bankQuestionId,
  quizzes,
}: {
  bankQuestionId: string
  quizzes: QuizOption[]
}) {
  const router = useRouter()
  const [quizId, setQuizId] = useState('')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleAdd() {
    if (!quizId) return
    setAdding(true)
    setMessage(null)
    const res = await importBankQuestionIntoQuiz(bankQuestionId, quizId)
    setAdding(false)
    if (res.error) {
      setMessage(res.error)
      return
    }
    setMessage('Added to quiz')
    setQuizId('')
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={quizId}
          onChange={(e) => {
            setQuizId(e.target.value)
            setMessage(null)
          }}
          className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 max-w-[180px]"
        >
          <option value="">Add to quiz…</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>{q.title}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!quizId || adding}
          className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
      {message && (
        <span className={`text-xs ${message === 'Added to quiz' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
