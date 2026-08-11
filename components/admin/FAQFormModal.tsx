'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createFAQ, updateFAQ } from '@/lib/actions/faqs'
import type { FAQ, Status } from '@/types'

interface FAQFormModalProps {
  faq?: FAQ | null
  isOpen: boolean
  onClose: () => void
}

export function FAQFormModal({ faq, isOpen, onClose }: FAQFormModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    question: faq?.question ?? '',
    short_answer: faq?.short_answer ?? '',
    detailed_answer: faq?.detailed_answer ?? '',
    customer_ready_answer: faq?.customer_ready_answer ?? '',
    category: faq?.category ?? 'General',
    tags: faq?.tags?.join(', ') ?? '',
    priority: faq?.priority?.toString() ?? '0',
    status: (faq?.status ?? 'published') as Status,
  })

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        question: form.question,
        short_answer: form.short_answer,
        detailed_answer: form.detailed_answer || undefined,
        customer_ready_answer: form.customer_ready_answer || undefined,
        category: form.category || 'General',
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        priority: parseInt(form.priority) || 0,
        status: form.status,
      }

      const res = faq
        ? await updateFAQ(faq.id, payload)
        : await createFAQ(payload)

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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {faq ? 'Edit FAQ' : 'Create FAQ'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Question *</label>
            <input
              required
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="e.g. What is the pricing policy for enterprise plans?"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Short Answer *</label>
            <textarea
              required
              rows={2}
              value={form.short_answer}
              onChange={e => setForm(f => ({ ...f, short_answer: e.target.value }))}
              placeholder="Concise quick summary answer"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Customer-Ready Answer (Copyable)</label>
            <textarea
              rows={3}
              value={form.customer_ready_answer}
              onChange={e => setForm(f => ({ ...f, customer_ready_answer: e.target.value }))}
              placeholder="Polished text salesmen can copy & send directly to clients"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Answer (Internal)</label>
            <textarea
              rows={3}
              value={form.detailed_answer}
              onChange={e => setForm(f => ({ ...f, detailed_answer: e.target.value }))}
              placeholder="In-depth background details for internal rep understanding"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Pricing, Technical, Onboarding"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority (Higher = Top)</label>
              <input
                type="number"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tags (comma separated)</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="pricing, enterprise, discount"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Saving…' : faq ? 'Update FAQ' : 'Create FAQ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
