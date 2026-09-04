'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createScript, updateScript } from '@/lib/actions/scripts'
import type { SalesScript, ScriptType, Status, AiContentType } from '@/types'
import { AiAssistButton } from '@/components/ai/AiAssistButton'

const SCRIPT_TYPES: { type: ScriptType; label: string }[] = [
  { type: 'greeting', label: 'Greeting' },
  { type: 'whatsapp', label: 'WhatsApp Message' },
  { type: 'voice_note_script', label: 'Voice Note Script' },
  { type: 'follow_up', label: 'Follow-Up' },
  { type: 'closing', label: 'Closing' },
  { type: 'payment', label: 'Payment Message' },
  { type: 'objection_response', label: 'Objection Response' },
  { type: 'upsell', label: 'Upsell' },
  { type: 'cross_sell', label: 'Cross-Sell' },
  { type: 'after_sales', label: 'After-Sales' },
  { type: 'review_request', label: 'Review Request' },
  { type: 'warranty_explanation', label: 'Warranty Explanation' },
]

interface ScriptFormModalProps {
  script?: SalesScript | null
  isOpen: boolean
  onClose: () => void
  defaultValues?: Record<string, any>
  tools?: { id: string; name: string }[]
}

export function ScriptFormModal({ script, isOpen, onClose, defaultValues, tools = [] }: ScriptFormModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: defaultValues?.title ?? script?.title ?? '',
    script_type: (defaultValues?.script_type ?? script?.script_type ?? 'whatsapp') as ScriptType,
    language: defaultValues?.language ?? script?.language ?? 'English',
    // English content
    content: defaultValues?.content ?? script?.content ?? '',
    // Hinglish content — the primary authored language for Urdu/Hinglish scripts
    content_hinglish: defaultValues?.content_hinglish ?? script?.content_hinglish ?? '',
    when_to_use: defaultValues?.when_to_use ?? script?.when_to_use ?? '',
    tool_id: defaultValues?.tool_id ?? script?.tool_id ?? '',
    related_objection: defaultValues?.related_objection ?? script?.related_objection ?? '',
    tags: (Array.isArray(defaultValues?.tags) ? defaultValues?.tags.join(', ') : defaultValues?.tags) ?? script?.tags?.join(', ') ?? '',
    status: (defaultValues?.status ?? script?.status ?? 'published') as Status,
  })

  useEffect(() => {
    if (!isOpen) return
    setForm({
      title: defaultValues?.title ?? script?.title ?? '',
      script_type: (defaultValues?.script_type ?? script?.script_type ?? 'whatsapp') as ScriptType,
      language: defaultValues?.language ?? script?.language ?? 'English',
      content: defaultValues?.content ?? script?.content ?? '',
      content_hinglish: defaultValues?.content_hinglish ?? script?.content_hinglish ?? '',
      when_to_use: defaultValues?.when_to_use ?? script?.when_to_use ?? '',
      tool_id: defaultValues?.tool_id ?? script?.tool_id ?? '',
      related_objection: defaultValues?.related_objection ?? script?.related_objection ?? '',
      tags: (Array.isArray(defaultValues?.tags) ? defaultValues?.tags.join(', ') : defaultValues?.tags) ?? script?.tags?.join(', ') ?? '',
      status: (defaultValues?.status ?? script?.status ?? 'published') as Status,
    })
  }, [script?.id, isOpen, defaultValues])

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        title: form.title,
        script_type: form.script_type,
        language: form.language || 'English',
        content: form.content,
        content_hinglish: form.content_hinglish || undefined,
        when_to_use: form.when_to_use || undefined,
        tool_id: form.tool_id || null,
        related_objection: form.related_objection || undefined,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        status: form.status,
      }

      const res = script
        ? await updateScript(script.id, payload)
        : await createScript(payload)

      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl border-0 sm:border border-gray-100 dark:border-gray-700 shadow-2xl w-full sm:max-w-xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {script ? 'Edit Script' : 'Create Sales Script'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. First Contact WhatsApp Greeting"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Script Type *</label>
              <select
                value={form.script_type}
                onChange={e => setForm(f => ({ ...f, script_type: e.target.value as ScriptType }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                {SCRIPT_TYPES.map(st => (
                  <option key={st.type} value={st.type}>{st.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Language</label>
              <select
                value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="Roman Urdu">Roman Urdu</option>
              </select>
            </div>
          </div>

          {/* Hinglish content — shown when present (primary authored language) */}
          {(form.content_hinglish !== '' || script?.content_hinglish) && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-400">
                  Script Content <span className="font-normal opacity-75">(Hinglish — original)</span>
                </label>
              </div>
              <textarea
                rows={5}
                value={form.content_hinglish}
                onChange={e => setForm(f => ({ ...f, content_hinglish: e.target.value }))}
                placeholder="Hinglish script content…"
                className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/20 dark:bg-brand-950/20 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none font-mono text-xs"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Script Content{form.content_hinglish ? ' (English)' : ' *'}
              </label>
              <AiAssistButton
                contentType="script"
                fieldName="content"
                existingContext={JSON.stringify({ title: form.title, script_type: form.script_type, language: form.language, when_to_use: form.when_to_use })}
                onResult={(text) => setForm(f => ({ ...f, content: text }))}
              />
            </div>
            <textarea
              required
              rows={5}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="The exact word-for-word message salesmen should send/say…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none font-mono text-xs"
            />
          </div>

          {/* If no hinglish exists yet, offer a field to add it */}
          {!form.content_hinglish && !script?.content_hinglish && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Script Content (Hinglish — optional)
              </label>
              <textarea
                rows={3}
                value={form.content_hinglish}
                onChange={e => setForm(f => ({ ...f, content_hinglish: e.target.value }))}
                placeholder="Add Hinglish version if this script is delivered in Hinglish…"
                className="w-full px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none font-mono text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">When to Use</label>
            <input
              value={form.when_to_use}
              onChange={e => setForm(f => ({ ...f, when_to_use: e.target.value }))}
              placeholder="e.g. Send 24 hours after initial inquiry if no reply"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tool (linked to)</label>
              <select
                value={form.tool_id}
                onChange={e => setForm(f => ({ ...f, tool_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="">General (no specific tool)</option>
                {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Saving…' : script ? 'Update Script' : 'Create Script'}
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
