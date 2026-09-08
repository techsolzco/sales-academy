import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: { icon: LucideIcon, title: string, description: string, actionLabel?: string, actionHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
      <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
