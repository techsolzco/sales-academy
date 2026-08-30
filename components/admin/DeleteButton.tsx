'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import type { ActionResult } from '@/types'

interface Props {
  onDelete: () => Promise<ActionResult>
  label?: string
  size?: 'sm' | 'md'
}

export function DeleteButton({ onDelete, label = 'Delete', size = 'sm' }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={() => {
            setConfirming(false)
            startTransition(async () => { await onDelete() })
          }}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Yes, delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={label}
      className={
        size === 'sm'
          ? 'p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
          : 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors font-medium'
      }
    >
      <Trash2 className={size === 'sm' ? 'w-4 h-4' : 'w-4 h-4'} />
      {size === 'md' && label}
    </button>
  )
}
