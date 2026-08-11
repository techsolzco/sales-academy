import Link from 'next/link'
import { BookOpen, Users, MoreVertical, Edit, Trash2, UserPlus } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
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
  beginner:     'text-emerald-600 bg-emerald-50',
  intermediate: 'text-blue-600 bg-blue-50',
  advanced:     'text-purple-600 bg-purple-50',
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
  const gradientIndex = id.charCodeAt(0) % gradients.length
  const gradient = gradients[gradientIndex]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
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
        {/* Action menu overlay */}
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
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">
            {title}
          </h3>
        </div>

        {category && (
          <p className="text-xs text-gray-400 mb-2">{category}</p>
        )}

        {description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
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

        <Link
          href={`/admin/courses/${id}`}
          className="block w-full text-center py-2 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium hover:bg-brand-100 transition"
        >
          Open Course →
        </Link>
      </div>
    </div>
  )
}
