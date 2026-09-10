'use client'

import { useState } from 'react'
import { CheckCircle, Circle, BookOpen, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toggleReviewStatus } from './actions'

export function ReviewButton({ 
  item, 
  isReviewed, 
  courseId 
}: { 
  item: { id: string, title: string, type: string }, 
  isReviewed: boolean,
  courseId: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    setLoading(true)
    await toggleReviewStatus(item.id, item.type, !isReviewed)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition border-b border-gray-50 dark:border-gray-700/60 last:border-0 group cursor-pointer" onClick={handleToggle}>
      {loading ? (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
      ) : isReviewed ? (
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-200 dark:text-gray-600 group-hover:text-brand-300 flex-shrink-0 transition" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isReviewed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
          {item.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">{item.type.replace('_', ' ')}</p>
      </div>
      <button 
        disabled={loading}
        className="text-xs font-medium text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 px-3 py-1.5 rounded-full transition"
      >
        {isReviewed ? 'Reviewed' : 'Mark as Reviewed'}
      </button>
    </div>
  )
}
