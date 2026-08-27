'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAssignment, updateAssignment } from '@/lib/actions/assignments'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

interface Tool { id: string; name: string }
interface Quiz { id: string; title: string; tool_id: string | null }

interface Props {
  assignmentId?: string | null
  initialData?: any
  tools: Tool[]
  quizzes: Quiz[]
}

export function AssignmentEditor({ assignmentId, initialData, tools, quizzes }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [instructions, setInstructions] = useState(initialData?.instructions || '')
  const [toolId, setToolId] = useState(initialData?.tool_id || '')
  const [quizId, setQuizId] = useState(initialData?.quiz_id || '')
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter quizzes to only those for the selected tool
  const toolQuizzes = quizzes.filter(q => !toolId || q.tool_id === toolId)

  // Reset quiz selection when tool changes
  useEffect(() => {
    if (quizId && !toolQuizzes.find(q => q.id === quizId)) {
      setQuizId('')
    }
  }, [toolId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const payload = {
      title,
      instructions,
      tool_id: toolId || null,
      quiz_id: quizId || null,
      due_date: dueDate || undefined,
    }

    let result
    if (assignmentId) {
      result = await updateAssignment(assignmentId, payload)
    } else {
      result = await createAssignment(payload)
    }

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/admin/assignments')
      router.refresh()
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {assignmentId ? 'Edit' : 'New'} Assignment
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memorize Leonardo scripts"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions *</label>
            <textarea
              required
              rows={5}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe what the salesman needs to study and submit..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>

          {/* Tool picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Tool (Optional)</label>
              <select
                value={toolId}
                onChange={(e) => setToolId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">No specific tool</option>
                {tools.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Ties the assignment to a tool's content (FAQs, scripts, objections)</p>
            </div>

            {/* Quiz picker — only shows quizzes for selected tool */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attach Quiz (Optional)
              </label>
              <select
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                disabled={toolQuizzes.length === 0}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">No quiz</option>
                {toolQuizzes.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {toolId && toolQuizzes.length === 0
                  ? 'No quizzes exist for this tool yet'
                  : !toolId
                  ? 'Select a tool to see its quizzes'
                  : 'Salesman must also pass this quiz'}
              </p>
            </div>
          </div>

          {/* Due date */}
          <DateTimePicker
            label="Due Date (Optional)"
            value={dueDate}
            onChange={setDueDate}
          />

          {/* Submission guidance box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Salesmen can submit:</p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>A written text response / summary</li>
              <li>An image URL (photo of notes, screenshot)</li>
              <li>A media link (Google Drive, YouTube unlisted, WhatsApp)</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
