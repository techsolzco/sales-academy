'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createCourse, updateCourse } from '@/lib/actions/courses'
import type { Course, Status, Difficulty, Visibility } from '@/types'
import { ImageUpload } from '@/components/ui/ImageUpload'

const CATEGORIES = [
  'Sales Skills', 'Product Training', 'Onboarding', 'Compliance',
  'Leadership', 'Customer Success', 'Communication', 'Other',
]

interface CourseFormProps {
  course?: Course
  onSuccess?: (id: string) => void
}

export function CourseForm({ course, onSuccess }: CourseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: course?.title ?? '',
    description: course?.description ?? '',
    thumbnail_url: course?.thumbnail_url ?? '',
    category: course?.category ?? '',
    difficulty: (course?.difficulty ?? '') as Difficulty | '',
    estimated_duration_minutes: course?.estimated_duration_minutes?.toString() ?? '',
    status: (course?.status ?? 'draft') as Status,
    visibility: (course?.visibility ?? 'all') as Visibility,
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
        thumbnail_url: form.thumbnail_url || undefined,
        category: form.category || undefined,
        difficulty: (form.difficulty || undefined) as Difficulty | undefined,
        estimated_duration_minutes: form.estimated_duration_minutes
          ? parseInt(form.estimated_duration_minutes)
          : undefined,
        status: form.status,
        visibility: form.visibility,
      }
      const result = course
        ? await updateCourse(course.id, payload)
        : await createCourse(payload)

      if (result.error) {
        setError(result.error)
      } else {
        const id = result.data?.id ?? course?.id
        if (onSuccess && id) onSuccess(id)
        else router.push(`/admin/courses/${id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Title *</label>
        <input
          required
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. Google AI Pro Sales Training"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="What will salesmen learn in this course?"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
      </div>

      {/* Thumbnail URL */}
      <div>
        <ImageUpload
          currentUrl={form.thumbnail_url || undefined}
          bucket="course-thumbnails"
          folder="thumbnails"
          onUpload={(url) => update('thumbnail_url', url)}
          label="Course Thumbnail"
        />
      </div>

      {/* Category + Difficulty row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <select
            value={form.category}
            onChange={e => update('category', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Difficulty</label>
          <select
            value={form.difficulty}
            onChange={e => update('difficulty', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Select difficulty</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Duration + Status row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Duration (minutes)</label>
          <input
            type="number"
            min="0"
            value={form.estimated_duration_minutes}
            onChange={e => update('estimated_duration_minutes', e.target.value)}
            placeholder="60"
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

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
        <select
          value={form.visibility}
          onChange={e => update('visibility', e.target.value as Visibility)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="all">All Salesmen</option>
          <option value="selected">Selected Salesmen Only</option>
          <option value="team">By Department / Team</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isPending ? 'Saving…' : course ? 'Update Course' : 'Create Course'}
      </button>
    </form>
  )
}
