'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createQuiz } from '@/lib/actions/quizzes'

interface Props {
  isOpen: boolean
  onClose: () => void
  toolId: string
  toolName: string
}

export function QuizCreateModal({ isOpen, onClose, toolId, toolName }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [passScore, setPassScore] = useState(80)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const res = await createQuiz({ title, pass_score: passScore, tool_id: toolId })
    setIsSubmitting(false)
    if (res.error || !res.data) { setError(res.error || 'Failed to create quiz'); return }
    onClose()
    router.push(`/admin/quizzes/${res.data.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Create Quiz</h2>
            <p className="text-xs text-gray-400 mt-0.5">For <span className="font-medium">{toolName}</span> — you'll add questions on the next screen</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quiz Title *</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`${toolName} — Knowledge Check`}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Passing Score — <span className="text-brand-600 font-bold">{passScore}%</span>
            </label>
            <input
              type="range" min="0" max="100" step="5"
              value={passScore}
              onChange={e => setPassScore(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '📝'}
              Create & Add Questions →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
