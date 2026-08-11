'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createLesson, updateLesson } from '@/lib/actions/lessons'
import type { Lesson, Status, Difficulty } from '@/types'

interface LessonFormProps {
  moduleId: string
  courseId: string
  lesson?: Lesson
}

export function LessonForm({ moduleId, courseId, lesson }: LessonFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: lesson?.title ?? '',
    subtitle: lesson?.subtitle ?? '',
    description: lesson?.description ?? '',
    thumbnail_url: lesson?.thumbnail_url ?? '',
    duration_minutes: lesson?.duration_minutes?.toString() ?? '',
    difficulty: (lesson?.difficulty ?? '') as Difficulty | '',
    is_required: lesson?.is_required ?? true,
    status: (lesson?.status ?? 'draft') as Status,
  })

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || undefined,
        description: form.description || undefined,
        thumbnail_url: form.thumbnail_url || undefined,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
        difficulty: (form.difficulty || undefined) as Difficulty | undefined,
        is_required: form.is_required,
        status: form.status,
      }
      const result = lesson
        ? await updateLesson(lesson.id, moduleId, courseId, payload)
        : await createLesson(moduleId, courseId, payload)

      if (result.error) setError(result.error)
      else if (lesson) router.push(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`)
      else router.push(`/admin/courses/${courseId}/modules/${moduleId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Lesson Title *</label>
        <input
          required
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. Understanding Gemini AI Capabilities"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtitle</label>
        <input
          value={form.subtitle}
          onChange={e => update('subtitle', e.target.value)}
          placeholder="Short supporting text shown under the title"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="What will learners gain from this lesson?"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Thumbnail URL</label>
        <input
          type="url"
          value={form.thumbnail_url}
          onChange={e => update('thumbnail_url', e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (minutes)</label>
          <input
            type="number"
            min="0"
            value={form.duration_minutes}
            onChange={e => update('duration_minutes', e.target.value)}
            placeholder="10"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Difficulty</label>
          <select
            value={form.difficulty}
            onChange={e => update('difficulty', e.target.value as Difficulty)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Inherit from course</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Required?</label>
          <select
            value={form.is_required ? 'true' : 'false'}
            onChange={e => update('is_required', e.target.value === 'true')}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="true">Required</option>
            <option value="false">Optional</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isPending ? 'Saving…' : lesson ? 'Update Lesson' : 'Create Lesson'}
      </button>
    </form>
  )
}
