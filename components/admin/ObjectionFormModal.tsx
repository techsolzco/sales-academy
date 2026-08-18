'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createObjection, updateObjection } from '@/lib/actions/objections'
import type { Objection, Difficulty, Status, AiContentType } from '@/types'
import { AiAssistButton } from '@/components/ai/AiAssistButton'

interface ObjectionFormModalProps {
  objection?: Objection | null
  isOpen: boolean
  onClose: () => void
  defaultValues?: Record<string, any>
}

export function ObjectionFormModal({ objection, isOpen, onClose, defaultValues }: ObjectionFormModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    objection_text: defaultValues?.objection_text ?? objection?.objection_text ?? '',
    meaning: defaultValues?.meaning ?? objection?.meaning ?? '',
    recommended_response: defaultValues?.recommended_response ?? objection?.recommended_response ?? '',
    alternative_response: defaultValues?.alternative_response ?? objection?.alternative_response ?? '',
    do_not_say: defaultValues?.do_not_say ?? objection?.do_not_say ?? '',
    related_product: defaultValues?.related_product ?? objection?.related_product ?? '',
    difficulty: (defaultValues?.difficulty ?? objection?.difficulty ?? 'beginner') as Difficulty,
    status: (defaultValues?.status ?? objection?.status ?? 'published') as Status,
  })

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        objection_text: form.objection_text,
        meaning: form.meaning || undefined,
        recommended_response: form.recommended_response,
        alternative_response: form.alternative_response || undefined,
        do_not_say: form.do_not_say || undefined,
        related_product: form.related_product || undefined,
        difficulty: form.difficulty,
        status: form.status,
      }

      const res = objection
        ? await updateObjection(objection.id, payload)
        : await createObjection(payload)

      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {objection ? 'Edit Objection' : 'Add Customer Objection'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Customer Objection Text *</label>
            <input
              required
              value={form.objection_text}
              onChange={e => setForm(f => ({ ...f, objection_text: e.target.value }))}
              placeholder='e.g. "Your price is way too expensive compared to X"'
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">What the Customer Really Means</label>
            <input
              value={form.meaning}
              onChange={e => setForm(f => ({ ...f, meaning: e.target.value }))}
              placeholder="e.g. They don't yet see enough ROI value to justify budget"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400">✅ Recommended Response *</label>
              <AiAssistButton
                contentType="objection"
                fieldName="recommended_response"
                existingContext={JSON.stringify({ objection_text: form.objection_text, meaning: form.meaning })}
                onResult={(text) => setForm(f => ({ ...f, recommended_response: text }))}
              />
            </div>
            <textarea
              required
              rows={3}
              value={form.recommended_response}
              onChange={e => setForm(f => ({ ...f, recommended_response: e.target.value }))}
              placeholder="The best, value-oriented response strategy to use…"
              className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/30 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-red-700 dark:text-red-400 mb-1">🚫 DO NOT SAY</label>
            <textarea
              rows={2}
              value={form.do_not_say}
              onChange={e => setForm(f => ({ ...f, do_not_say: e.target.value }))}
              placeholder="e.g. 'We are actually cheap' or defensive statements"
              className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/20 dark:bg-red-950/30 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Alternative Backup Response</label>
              <AiAssistButton
                contentType="objection"
                fieldName="alternative_response"
                existingContext={JSON.stringify({ objection_text: form.objection_text, meaning: form.meaning })}
                onResult={(text) => setForm(f => ({ ...f, alternative_response: text }))}
              />
            </div>
            <textarea
              rows={2}
              value={form.alternative_response}
              onChange={e => setForm(f => ({ ...f, alternative_response: e.target.value }))}
              placeholder="Secondary approach if customer remains hesitant…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Related Product</label>
              <input
                value={form.related_product}
                onChange={e => setForm(f => ({ ...f, related_product: e.target.value }))}
                placeholder="Google AI Pro"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Saving…' : objection ? 'Update Objection' : 'Create Objection'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
