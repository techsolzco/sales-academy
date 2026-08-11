import { cn } from '@/lib/utils'
import type { Status } from '@/types'

const config: Record<Status, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', className: 'bg-green-100 text-green-700' },
  archived:  { label: 'Archived',  className: 'bg-amber-100 text-amber-700' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status] ?? config.draft
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', className)}>
      {label}
    </span>
  )
}
