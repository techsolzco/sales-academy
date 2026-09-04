'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createFAQ, updateFAQ } from '@/lib/actions/faqs'
import type { FAQ, Status, AiContentType } from '@/types'
import { AiAssistButton } from '@/components/ai/AiAssistButton'
import { FAQ_CATEGORIES } from '@/lib/constants/faq-categories'

interface FAQFormModalProps {
  faq?: FAQ | null
  isOpen: boolean
  onClose: () => void
  defaultValues?: Record<string, any>
  tools?: { id: string; name: string }[]
}

export function FAQFormModal({ faq, isOpen, onClose, defaultValues, tools = [] }: FAQFormModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    // English fields (always preserved — English is generated translation)
    question: defaultValues?.question ?? faq?.question ?? '',
    short_answer: defaultValues?.short_answer ?? faq?.short_answer ?? '',
    detailed_answer: defaultValues?.detailed_answer ?? faq?.detailed_answer ?? '',
    customer_ready_answer: defaultValues?.customer_ready_answer ?? faq?.customer_ready_answer ?? '',
    // Hinglish fields — the primary authored language
    question_hinglish: defaultValues?.question_hinglish ?? faq?.question_hinglish ?? '',
    short_answer_hinglish: defaultValues?.short_answer_hinglish ?? faq?.short_answer_hinglish ?? '',
    customer_ready_answer_hinglish: defaultValues?.customer_ready_answer_hinglish ?? faq?.customer_ready_answer_hinglish ?? '',
    // Meta
    category: defaultValues?.category ?? faq?.category ?? 'General',
    tags: (Array.isArray(defaultValues?.tags) ? defaultValues?.tags.join(', ') : defaultValues?.tags) ?? faq?.tags?.join(', ') ?? '',
    priority: defaultValues?.priority?.toString() ?? faq?.priority?.toString() ?? '0',
    status: (defaultValues?.status ?? faq?.status ?? 'published') as Status,
    tool_id: defaultValues?.tool_id ?? faq?.tool_id ?? '',
  })

  useEffect(() => {
    if (!isOpen) return
    setForm({
      question: defaultValues?.question ?? faq?.question ?? '',
      short_answer: defaultValues?.short_answer ?? faq?.short_answer ?? '',
      detailed_answer: defaultValues?.detailed_answer ?? faq?.detailed_answer ?? '',
      customer_ready_answer: defaultValues?.customer_ready_answer ?? faq?.customer_ready_answer ?? '',
      question_hinglish: defaultValues?.question_hinglish ?? faq?.question_hinglish ?? '',
      short_answer_hinglish: defaultValues?.short_answer_hinglish ?? faq?.short_answer_hinglish ?? '',
      customer_ready_answer_hinglish: defaultValues?.customer_ready_answer_hinglish ?? faq?.customer_ready_answer_hinglish ?? '',
      category: defaultValues?.category ?? faq?.category ?? 'General',
      tags: (Array.isArray(defaultValues?.tags) ? defaultValues?.tags.join(', ') : defaultValues?.tags) ?? faq?.tags?.join(', ') ?? '',
      priority: defaultValues?.priority?.toString() ?? faq?.priority?.toString() ?? '0',
      status: (defaultValues?.status ?? faq?.status ?? 'published') as Status,
      tool_id: defaultValues?.tool_id ?? faq?.tool_id ?? '',
    })
  }, [faq?.id, isOpen, defaultValues])

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        question: form.question,
        question_hinglish: form.question_hinglish || undefined,
        short_answer: form.short_answer,
        short_answer_hinglish: form.short_answer_hinglish || undefined,
        detailed_answer: form.detailed_answer || undefined,
        customer_ready_answer: form.customer_ready_answer || undefined,
        customer_ready_answer_hinglish: form.customer_ready_answer_hinglish || undefined,
        category: form.category || 'General',
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        priority: parseInt(form.priority) || 0,
        status: form.status,
        tool_id: form.tool_id || null,
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

  // Helper to tell if a record has hinglish content
  const hasHinglish = !!(faq?.question_hinglish || faq?.short_answer_hinglish || faq?.customer_ready_answer_hinglish)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl border-0 sm:border border-gray-100 dark:border-gray-700 shadow-2xl w-full sm:max-w-xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {faq ? 'Edit FAQ' : 'Create FAQ'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Question ── */}
          {hasHinglish && form.question_hinglish && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Question <span className="font-normal opacity-70">(Hinglish — original)</span>
              </label>
              <input
                value={form.question_hinglish}
                onChange={e => setForm(f => ({ ...f, question_hinglish: e.target.value }))}
                placeholder="Hinglish question…"
                className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/20 dark:bg-brand-950/20 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Question{hasHinglish ? ' (English)' : ' *'}
            </label>
            <input
              required
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="e.g. What is the pricing policy for enterprise plans?"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
          {!hasHinglish && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Question (Hinglish — optional)
              </label>
              <input
                value={form.question_hinglish}
                onChange={e => setForm(f => ({ ...f, question_hinglish: e.target.value }))}
                placeholder="Add Hinglish version if used in Hinglish conversations…"
                className="w-full px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          )}

          {/* ── Short Answer ── */}
          {hasHinglish && form.short_answer_hinglish && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Short Answer <span className="font-normal opacity-70">(Hinglish — original)</span>
              </label>
              <textarea
                rows={2}
                value={form.short_answer_hinglish}
                onChange={e => setForm(f => ({ ...f, short_answer_hinglish: e.target.value }))}
                placeholder="Hinglish short answer…"
                className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/20 dark:bg-brand-950/20 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
              />
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Short Answer{hasHinglish ? ' (English)' : ' *'}
              </label>
              <AiAssistButton
                contentType="faq"
                fieldName="short_answer"
                existingContext={JSON.stringify({ question: form.question, category: form.category })}
                onResult={(text) => setForm(f => ({ ...f, short_answer: text }))}
              />
            </div>
            <textarea
              required
              rows={2}
              value={form.short_answer}
              onChange={e => setForm(f => ({ ...f, short_answer: e.target.value }))}
              placeholder="Concise quick summary answer"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          {/* ── Customer-Ready Answer ── */}
          {hasHinglish && form.customer_ready_answer_hinglish && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Customer-Ready Answer <span className="font-normal opacity-70">(Hinglish — original)</span>
              </label>
              <textarea
                rows={3}
                value={form.customer_ready_answer_hinglish}
                onChange={e => setForm(f => ({ ...f, customer_ready_answer_hinglish: e.target.value }))}
                placeholder="Hinglish customer-ready answer…"
                className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/20 dark:bg-brand-950/20 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
              />
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Customer-Ready Answer{hasHinglish ? ' (English)' : ' (Copyable)'}
              </label>
              <AiAssistButton
                contentType="faq"
                fieldName="customer_ready_answer"
                existingContext={JSON.stringify({ question: form.question, category: form.category })}
                onResult={(text) => setForm(f => ({ ...f, customer_ready_answer: text }))}
              />
            </div>
            <textarea
              rows={3}
              value={form.customer_ready_answer}
              onChange={e => setForm(f => ({ ...f, customer_ready_answer: e.target.value }))}
              placeholder="Polished text salesmen can copy & send directly to clients"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          {/* ── Detailed Answer ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Detailed Answer (Internal)</label>
              <AiAssistButton
                contentType="faq"
                fieldName="detailed_answer"
                existingContext={JSON.stringify({ question: form.question, category: form.category })}
                onResult={(text) => setForm(f => ({ ...f, detailed_answer: text }))}
              />
            </div>
            <textarea
              rows={3}
              value={form.detailed_answer}
              onChange={e => setForm(f => ({ ...f, detailed_answer: e.target.value }))}
              placeholder="In-depth background details for internal rep understanding"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                {FAQ_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Related Tool (Optional)</label>
              <select
                value={form.tool_id}
                onChange={e => setForm(f => ({ ...f, tool_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="">General (no specific tool)</option>
                {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Priority (Higher = Top)</label>
              <input
                type="number"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="pricing, enterprise, discount"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
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
