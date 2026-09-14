'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Users, Edit, UserPlus, Trash2, AlertTriangle, Loader2, XCircle } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { deleteCourse } from '@/lib/actions/courses'
import type { Status, Difficulty } from '@/types'

interface CourseCardProps {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  category: string | null
  difficulty: Difficulty | null
  status: Status
  moduleCount: number
  assignmentCount: number
}

const difficultyColors: Record<Difficulty, string> = {
  beginner:     'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30',
  intermediate: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
  advanced:     'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30',
}

const gradients = [
  'from-brand-600 to-brand-800',
  'from-purple-600 to-purple-900',
  'from-emerald-600 to-emerald-900',
  'from-rose-600 to-rose-900',
  'from-amber-500 to-orange-700',
]

export function CourseCard({
  id, title, description, thumbnail_url, category, difficulty, status,
  moduleCount, assignmentCount,
}: CourseCardProps) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleting] = useTransition()

  const gradientIndex = id.charCodeAt(0) % gradients.length
  const gradient = gradients[gradientIndex]

  const handleDelete = () => {
    setDeleteError(null)
    startDeleting(async () => {
      const res = await deleteCourse(id)
      if (res.error) { setDeleteError(res.error); return }
      setConfirmDelete(false)
      router.refresh()
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      {/* Thumbnail */}
      <div className={`h-36 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        {thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail_url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/30" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={status} />
        </div>
        {/* Edit / Assign hover buttons */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/courses/${id}/edit`}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-700 transition"
              title="Edit course"
            >
              <Edit className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/admin/courses/${id}/assign`}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-700 transition"
              title="Assign to salesmen"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-2 flex-1">
            {title}
          </h3>
        </div>

        {category && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{category}</p>
        )}

        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {moduleCount} module{moduleCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {assignmentCount} assigned
          </span>
          {difficulty && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${difficultyColors[difficulty]}`}>
              {difficulty}
            </span>
          )}
        </div>

        {/* Inline delete confirm */}
        {confirmDelete ? (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Delete <strong>{title}</strong>? This cannot be undone.</span>
            </div>
            {deleteError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-1 transition"
              >
                {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Yes, delete
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link
              href={`/admin/courses/${id}`}
              className="flex-1 text-center py-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-medium hover:bg-brand-100 dark:hover:bg-brand-900/50 transition"
            >
              Open Course →
            </Link>
            <button
              onClick={() => { setConfirmDelete(true); setDeleteError(null) }}
              className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition border border-red-100 dark:border-red-800"
              title="Delete course"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

