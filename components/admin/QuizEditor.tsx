'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuiz, updateQuiz } from '@/lib/actions/quizzes'
import { QuizQuestionBuilder } from './QuizQuestionBuilder'

interface Props {
  quizId: string | null
  initialData?: any
  lessons: { id: string; title: string }[]
  tools?: { id: string; name: string }[]
}

export function QuizEditor({ quizId, initialData, lessons, tools = [] }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [lessonId, setLessonId] = useState(initialData?.lesson_id || '')
  const [toolId, setToolId] = useState(initialData?.tool_id || '')
  const [passScore, setPassScore] = useState(initialData?.pass_score ?? 80)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(quizId)
  const [savedTool, setSavedTool] = useState<{ id: string; name: string } | null>(
    initialData?.tool ? initialData.tool : tools.find(t => t.id === initialData?.tool_id) || null
  )
  const [error, setError] = useState<string | null>(null)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const payload = {
      title,
      description: description || undefined,
      lesson_id: lessonId || null,
      tool_id: toolId || null,
      pass_score: passScore,
    }

    if (savedId) {
      const res = await updateQuiz(savedId, payload)
      setIsSubmitting(false)
      if (res.error) { setError(res.error); return }
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2500)
      const tool = tools.find(t => t.id === toolId) || null
      setSavedTool(tool)
      router.refresh()
    } else {
      const res = await createQuiz(payload)
      setIsSubmitting(false)
      if (res.error || !res.data) { setError(res.error || 'Failed to create'); return }
      const newId = res.data.id
      setSavedId(newId)
      const tool = tools.find(t => t.id === toolId) || null
      setSavedTool(tool)
      setSettingsSaved(true)
      // Push to the quiz detail page so browser URL + the builder both update
      router.push(`/admin/quizzes/${newId}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {savedId ? 'Edit' : 'New'} Quiz
      </h1>

      {/* Settings card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5">Quiz Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Leonardo Brush — Knowledge Check"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional — shown to salesmen before they start the quiz"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>

          {/* Tool + Lesson row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Linked Tool <span className="text-gray-400 font-normal">(enables AI generation)</span>
              </label>
              <select
                value={toolId}
                onChange={e => setToolId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">No tool</option>
                {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Linked Lesson</label>
              <select
                value={lessonId}
                onChange={e => setLessonId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">None</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          </div>

          {/* Passing score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Passing Score — <span className="text-brand-600 font-bold">{passScore}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={passScore}
              onChange={e => setPassScore(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            {settingsSaved && (
              <span className="text-sm text-green-600 font-medium">✓ Settings saved</span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Saving...' : savedId ? 'Update Settings' : 'Create Quiz & Add Questions →'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Question builder — only shown when quiz exists */}
      {savedId && (
        <QuizQuestionBuilder
          quizId={savedId}
          initialQuestions={initialData?.questions || []}
          toolId={savedTool?.id || toolId || null}
          toolName={savedTool?.name || tools.find(t => t.id === toolId)?.name || null}
        />
      )}
    </div>
  )
}
