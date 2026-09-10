import Link from 'next/link'
import { BookOpen, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import type { Difficulty } from '@/types'

interface StudentCourseCardProps {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  category: string | null
  difficulty: Difficulty | null
  lessonCount: number
  completedCount: number
  durationMinutes: number | null
  dueDate: string | null
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

export function StudentCourseCard({
  id, title, description, thumbnail_url, category, difficulty,
  lessonCount, completedCount, durationMinutes, dueDate,
}: StudentCourseCardProps) {
  const gradient = gradients[id.charCodeAt(0) % gradients.length]
  const pct = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0
  const isComplete = pct === 100 && lessonCount > 0
  const isStarted = completedCount > 0

  return (
    <Link
      href={`/dashboard/training/${id}`}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col"
    >
      {/* Thumbnail */}
      <div className={`h-36 bg-gradient-to-br ${gradient} relative overflow-hidden flex-shrink-0`}>
        {thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail_url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/30" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          {isComplete ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm">
              <CheckCircle className="w-3 h-3" /> Complete
            </span>
          ) : isStarted ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-brand-600 text-white shadow-sm">
              {pct}% done
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur text-white shadow-sm">
              New
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        <div
          className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-2 mb-1">
          {title}
        </h3>
        {category && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{category}</p>
        )}
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {completedCount}/{lessonCount} lessons
          </span>
          {durationMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {durationMinutes} min
            </span>
          )}
          {difficulty && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${difficultyColors[difficulty]}`}>
              {difficulty}
            </span>
          )}
          {dueDate && (
            <span className="text-amber-600 dark:text-amber-400">
              Due {new Date(dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="mt-auto">
          <span className="flex items-center justify-center gap-1 w-full py-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-medium group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition">
            {isComplete ? 'Review Course' : isStarted ? 'Continue' : 'Start Course'}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
