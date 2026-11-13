'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { createBankQuestion, updateBankQuestion, type BankQuestion } from '@/lib/actions/question-bank'

interface Props {
  tools: { id: string; name: string }[]
  categories: string[]
  // When set, the form edits this bank question instead of creating one.
  initial?: BankQuestion | null
}

export function QuestionBankForm({ tools, categories, initial }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initial)
  const [open, setOpen] = useState(isEditing)
  const [questionText, setQuestionText] = useState(initial?.question_text || '')
  const [category, setCategory] = useState(initial?.category || '')
  const [toolId, setToolId] = useState(initial?.tool_id || '')
  const [options, setOptions] = useState(
    initial?.options && initial.options.length >= 2
      ? initial.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct }))
      : [
          { option_text: '', is_correct: true },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setOptionText(index: number, text: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, option_text: text } : o)))
  }

  function setCorrect(index: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, is_correct: i === index })))
  }

  function addOption() {
    if (options.length >= 6) return
    setOptions((prev) => [...prev, { option_text: '', is_correct: false }])
  }

  function removeOption(index: number) {
    if (options.length <= 2) return
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Keep exactly one correct option if the removed one was correct.
      if (!next.some((o) => o.is_correct)) next[0].is_correct = true
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const payload = {
      question_text: questionText,
      category: category || null,
      tool_id: toolId || null,
      options,
    }
    const res = isEditing && initial
      ? await updateBankQuestion(initial.id, payload)
      : await createBankQuestion(payload)
    setSaving(false)
    if (res.error) {
      setError(res.error)
      return
    }
    if (isEditing) {
      router.push('/admin/question-bank')
      router.refresh()
      return
    }
    setQuestionText('')
    setCategory('')
    setToolId('')
    setOptions([
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ])
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    // Edit mode starts open and Cancel navigates away, so this is only
    // reachable in create mode.
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 transition-colors mb-6"
      >
        <Plus className="w-4 h-4" />
        New Bank Question
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{isEditing ? 'Edit bank question' : 'New bank question'}</h2>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
      <textarea
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
        rows={2}
        required
        placeholder="What should the salesman ask the customer first…?"
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 mb-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="bank-categories"
            placeholder="e.g. Objections"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          />
          <datalist id="bank-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tool (optional)</label>
          <select
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">No tool</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Options <span className="font-normal text-gray-400">(pick the one correct answer)</span>
      </label>
      <div className="space-y-2 mb-4">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="bank-correct-option"
              checked={o.is_correct}
              onChange={() => setCorrect(i)}
              title="Mark as correct answer"
              className="w-4 h-4 accent-emerald-600 flex-shrink-0"
            />
            <input
              value={o.option_text}
              onChange={(e) => setOptionText(i, e.target.value)}
              required
              placeholder={`Option ${i + 1}`}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              title="Remove option"
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button
          type="button"
          onClick={addOption}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 mb-4"
        >
          + Add option
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save to bank'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isEditing) router.push('/admin/question-bank')
            else setOpen(false)
          }}
          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
