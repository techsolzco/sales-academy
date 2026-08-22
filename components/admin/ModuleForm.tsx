'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createModule, updateModule } from '@/lib/actions/modules'
import type { Module, Status } from '@/types'

interface ModuleFormProps {
  courseId: string
  module?: Module
}

export function ModuleForm({ courseId, module }: ModuleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: module?.title ?? '',
    description: module?.description ?? '',
    duration_minutes: module?.duration_minutes?.toString() ?? '',
    status: (module?.status ?? 'draft') as Status,
  })

  function update(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
        status: form.status,
      }
      const result = module
        ? await updateModule(module.id, courseId, payload)
        : await createModule(courseId, payload)

      if (result.error) setError(result.error)
      else router.push(`/admin/courses/${courseId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Module Title *</label>
        <input
          required
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. Introduction to AI Features"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Brief overview of this module"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (minutes)</label>
          <input
            type="number"
            min="0"
            value={form.duration_minutes}
            onChange={e => update('duration_minutes', e.target.value)}
            placeholder="30"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
          <select
            value={form.status}
            onChange={e => update('status', e.target.value as Status)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isPending ? 'Saving…' : module ? 'Update Module' : 'Create Module'}
      </button>
    </form>
  )
}
