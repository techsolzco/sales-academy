'use client'

import { useState } from 'react'
import { X, Loader2, ExternalLink } from 'lucide-react'
import { createAssignment } from '@/lib/actions/assignments'

interface Props {
  isOpen: boolean
  onClose: () => void
  toolId: string
  toolName: string
  toolQuizzes: { id: string; title: string }[]
}

export function AssignmentCreateModal({ isOpen, onClose, toolId, toolName, toolQuizzes }: Props) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [quizId, setQuizId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const res = await createAssignment({
      title,
      instructions,
      tool_id: toolId,
      quiz_id: quizId || null,
      due_date: dueDate || undefined,
    })
    setIsSubmitting(false)
    if (res.error || !(res as any).data?.id) { setError(res.error || 'Failed to create assignment'); return }
    setCreatedId((res as any).data.id)
  }

  const handleClose = () => {
    setTitle(''); setInstructions(''); setQuizId(''); setDueDate('')
    setError(null); setCreatedId(null)
    onClose()
  }

  // Success state
  if (createdId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && handleClose()}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Assignment Created!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You can now add a study checklist and assign it to salesmen.
          </p>
          <div className="flex gap-3">
            <button onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Done
            </button>
            <a href={`/admin/assignments/${createdId}`}
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 flex items-center justify-center gap-2 transition-colors">
              <ExternalLink className="w-4 h-4" /> Open
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Create Assignment</h2>
            <p className="text-xs text-gray-400 mt-0.5">For <span className="font-medium">{toolName}</span></p>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`Memorize ${toolName} scripts`}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Instructions *</label>
            <textarea
              required
              rows={3}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Study the listed content and submit a photo of your notes as proof..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Attach Quiz (Optional)</label>
              <select
                value={quizId}
                onChange={e => setQuizId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">No quiz</option>
                {toolQuizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
              {toolQuizzes.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No quizzes for this tool yet</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date (Optional)</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 After creating, open the assignment to pick specific FAQs/Scripts/Objections for the study checklist and assign to salesmen.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '📋'}
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
