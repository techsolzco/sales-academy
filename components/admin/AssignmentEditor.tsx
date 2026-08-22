'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAssignment, updateAssignment } from '@/lib/actions/assignments'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

interface Props {
  assignmentId?: string | null
  initialData?: any
  courses: { id: string; title: string }[]
  lessons: { id: string; title: string; module_id: string }[]
}

export function AssignmentEditor({ assignmentId, initialData, courses, lessons }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [instructions, setInstructions] = useState(initialData?.instructions || '')
  const [courseId, setCourseId] = useState(initialData?.course_id || '')
  const [lessonId, setLessonId] = useState(initialData?.lesson_id || '')
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      title,
      instructions,
      course_id: courseId,
      lesson_id: lessonId || null,
      due_date: dueDate || undefined,
    }

    let result
    if (assignmentId) {
      result = await updateAssignment(assignmentId, payload)
    } else {
      result = await createAssignment(payload)
    }

    setIsSubmitting(false)
    if (result.error) {
      alert(result.error)
    } else {
      router.push('/admin/assignments')
      router.refresh()
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{assignmentId ? 'Edit' : 'New'} Assignment</h1>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions</label>
            <textarea
              required
              rows={6}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">Select a course...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lesson (Optional)</label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">None</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
          </div>
          <DateTimePicker
            label="Due Date (Optional)"
            value={dueDate}
            onChange={setDueDate}
          />
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
