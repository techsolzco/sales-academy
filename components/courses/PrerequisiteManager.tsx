'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  addPrerequisite,
  removePrerequisite,
  fetchPrerequisites,
  fetchAvailablePrerequisiteCourses,
} from '@/lib/actions/courses'
import type { PrerequisiteCourse } from '@/lib/actions/courses'
import { Loader2, Plus, Trash2, Lock, ArrowRight } from 'lucide-react'

interface Props {
  courseId: string
}

// Admin manager for course prerequisites (audit §3 #17): list the courses
// a student must complete before this one, remove edges, and add new ones
// from the courses not already required. Validation (existence,
// self-reference, cycle detection) lives in the server actions.
export function PrerequisiteManager({ courseId }: Props) {
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCourse[]>([])
  const [available, setAvailable] = useState<PrerequisiteCourse[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [prereqRes, availableRes] = await Promise.all([
      fetchPrerequisites(courseId),
      fetchAvailablePrerequisiteCourses(courseId),
    ])
    if (prereqRes.error) {
      setError(prereqRes.error)
    } else {
      setPrerequisites(prereqRes.data ?? [])
    }
    if (availableRes.error) {
      setError(availableRes.error)
    } else {
      setAvailable(availableRes.data ?? [])
    }
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    load()
  }, [load])

  function flash(message: string) {
    setNotice(message)
    setTimeout(() => setNotice(null), 3000)
  }

  function handleAdd() {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      const res = await addPrerequisite(courseId, selectedId)
      if (res.error) { setError(res.error); return }
      setSelectedId('')
      flash('Prerequisite added.')
      await load()
    })
  }

  function handleRemove(requiredCourseId: string, title: string) {
    if (!confirm(`Remove "${title}" as a prerequisite?`)) return
    setError(null)
    startTransition(async () => {
      const res = await removePrerequisite(courseId, requiredCourseId)
      if (res.error) { setError(res.error); return }
      flash('Prerequisite removed.')
      await load()
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading prerequisites…
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
        <Lock className="w-4 h-4 text-brand-500" /> Prerequisites
      </h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
        Students must complete these courses before they can open this one. The order defines the learning path.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}
      {notice && (
        <p className="text-sm text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 rounded-lg px-3 py-2 mb-4">{notice}</p>
      )}

      {prerequisites.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 text-center">
          No prerequisites — any student can open this course.
        </p>
      ) : (
        <ul className="space-y-2 mb-5">
          {prerequisites.map(prereq => (
            <li
              key={prereq.id}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 min-w-0 truncate">
                {prereq.title}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <span className="text-xs text-gray-400 flex-shrink-0">must be completed first</span>
              <button
                type="button"
                onClick={() => handleRemove(prereq.id, prereq.title)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50 flex-shrink-0"
                title="Remove prerequisite"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          disabled={isPending || available.length === 0}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-50"
        >
          <option value="">
            {available.length === 0 ? 'No other courses available' : 'Select a course to require first…'}
          </option>
          {available.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !selectedId}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Prerequisite
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
        View the course as a student in{' '}
        <Link href="/dashboard/training" className="text-brand-600 hover:underline">Training</Link>
        {' '}to see the lock in action.
      </p>
    </div>
  )
}
