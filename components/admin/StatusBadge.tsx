import { cn } from '@/lib/utils'
import type { Status } from '@/types'

const config: Record<Status, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  published: { label: 'Published', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  archived:  { label: 'Archived',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status] ?? config.draft
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', className)}>
      {label}
    </span>
  )
}
