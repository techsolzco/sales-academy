'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { History, Loader2, RotateCcw } from 'lucide-react'
import {
  fetchVersions,
  restoreVersion,
  type ContentType,
  type ContentVersion,
} from '@/lib/actions/content-versions'

interface ContentVersionHistoryProps {
  contentType: ContentType
  contentId: string
}

function snapshotSummary(version: ContentVersion): string {
  const s = version.snapshot
  const title =
    (typeof s.title === 'string' && s.title) ||
    (typeof s.question === 'string' && s.question) ||
    (typeof s.objection_text === 'string' && s.objection_text) ||
    '—'
  const status = typeof s.status === 'string' ? s.status : ''
  return status ? `${title} · ${status}` : title
}

export function ContentVersionHistory({ contentType, contentId }: ContentVersionHistoryProps) {
  const router = useRouter()
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchVersions(contentType, contentId)
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setVersions(res.data ?? [])
  }, [contentType, contentId])

  useEffect(() => {
    load()
  }, [load])

  async function handleRestore(version: ContentVersion) {
    if (
      !window.confirm(
        `Restore this version from ${new Date(version.created_at).toLocaleString()}? The current version will be saved first, so this can be undone.`,
      )
    ) {
      return
    }
    setRestoringId(version.id)
    const res = await restoreVersion(version.id)
    setRestoringId(null)
    if (res.error) {
      setError(res.error)
      return
    }
    startTransition(() => {
      router.refresh()
    })
    await load()
  }

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <History className="w-4 h-4" /> Version history
      </h3>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading versions…
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : versions.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No previous versions yet. The next edit will save one here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versions.map(version => (
            <li
              key={version.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {snapshotSummary(version)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(version.created_at).toLocaleString()}
                  {version.changed_by_name ? ` · by ${version.changed_by_name}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleRestore(version)}
                disabled={restoringId === version.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex-shrink-0"
              >
                {restoringId === version.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
