'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createTool, updateTool } from '@/lib/actions/tools'
import type { Tool, ToolCategory, Status } from '@/types'

const CATEGORIES: ToolCategory[] = [
  'AI Tools', 'Design Tools', 'Video Tools', 'Marketing Tools',
  'Research Tools', 'Productivity', 'Sales', 'Automation'
]

interface ToolFormModalProps {
  tool?: Tool | null
  isOpen: boolean
  onClose: () => void
}

export function ToolFormModal({ tool, isOpen, onClose }: ToolFormModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: tool?.name ?? '',
    logo_url: tool?.logo_url ?? '',
    description: tool?.description ?? '',
    website_url: tool?.website_url ?? '',
    category: (tool?.category ?? 'Sales') as ToolCategory,
    pricing: tool?.pricing ?? '',
    best_for: tool?.best_for ?? '',
    features: tool?.features?.join(', ') ?? '',
    tutorial_link: tool?.tutorial_link ?? '',
    youtube_tutorial_link: tool?.youtube_tutorial_link ?? '',
    tags: tool?.tags?.join(', ') ?? '',
    status: (tool?.status ?? 'published') as Status,
  })

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        name: form.name,
        logo_url: form.logo_url || undefined,
        description: form.description || undefined,
        website_url: form.website_url || undefined,
        category: form.category,
        pricing: form.pricing || undefined,
        best_for: form.best_for || undefined,
        features: form.features ? form.features.split(',').map(f => f.trim()).filter(Boolean) : [],
        tutorial_link: form.tutorial_link || undefined,
        youtube_tutorial_link: form.youtube_tutorial_link || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: form.status,
      }

      const res = tool
        ? await updateTool(tool.id, payload)
        : await createTool(payload)

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
            {tool ? 'Edit Sales Tool' : 'Add Sales Tool'}
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tool Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Canva Pro, ChatGPT Enterprise, Apollo.io"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none font-semibold text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={form.website_url}
                onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                placeholder="https://example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ToolCategory }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Overview of what this tool does and how it helps salesmen…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Pricing Model</label>
              <input
                value={form.pricing}
                onChange={e => setForm(f => ({ ...f, pricing: e.target.value }))}
                placeholder="Free / $20/mo / Enterprise"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Best For</label>
              <input
                value={form.best_for}
                onChange={e => setForm(f => ({ ...f, best_for: e.target.value }))}
                placeholder="Creating proposal pitch decks"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Features (comma separated)</label>
            <input
              value={form.features}
              onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
              placeholder="AI Generation, PDF Export, Templates"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tutorial Link</label>
              <input
                type="url"
                value={form.tutorial_link}
                onChange={e => setForm(f => ({ ...f, tutorial_link: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">YouTube Video ID / URL</label>
              <input
                value={form.youtube_tutorial_link}
                onChange={e => setForm(f => ({ ...f, youtube_tutorial_link: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://.../logo.png"
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

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Saving…' : tool ? 'Update Tool' : 'Create Tool'}
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
