'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { restoreItem, permanentlyDelete } from '@/lib/actions/recycle-bin'
import type { TrashedContentType, TrashedItem } from '@/lib/actions/recycle-bin'
import { Trash2, RotateCcw, AlertTriangle, Loader2, ChevronDown, ChevronRight, PackageOpen } from 'lucide-react'

const TYPE_LABELS: Record<TrashedContentType, string> = {
  courses: 'Courses',
  faqs: 'FAQs',
  scripts: 'Scripts',
  objections: 'Objections',
  voice_notes: 'Voice Notes',
  assignments: 'Assignments',
  quizzes: 'Quizzes',
  tools: 'Tools',
}

const TYPE_ORDER: TrashedContentType[] = ['courses', 'faqs', 'scripts', 'objections', 'voice_notes', 'assignments', 'quizzes', 'tools']

interface Props {
  initialData: Record<TrashedContentType, TrashedItem[]>
}

export function RecycleBin({ initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TrashedItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    TYPE_ORDER.forEach(t => { if (initialData[t].length > 0) init[t] = true })
    return init
  })
  const router = useRouter()

  const totalCount = TYPE_ORDER.reduce((sum, t) => sum + data[t].length, 0)

  async function handleRestore(item: TrashedItem) {
    setLoadingId(item.id)
    setError(null)
    try {
      const result = await restoreItem(item.type, item.id)
      if (result.error) { setError(result.error); return }
      setData(prev => ({ ...prev, [item.type]: prev[item.type].filter(i => i.id !== item.id) }))
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function handlePermanentDelete(item: TrashedItem) {
    setLoadingId(item.id)
    setError(null)
    setConfirmDelete(null)
    try {
      const result = await permanentlyDelete(item.type, item.id)
      if (result.error) { setError(result.error); return }
      setData(prev => ({ ...prev, [item.type]: prev[item.type].filter(i => i.id !== item.id) }))
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <PackageOpen className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-lg font-semibold text-gray-500">Recycle Bin is empty</p>
        <p className="text-sm text-gray-400 mt-1">Deleted items will appear here until permanently removed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      <p className="text-sm text-gray-500">{totalCount} item{totalCount !== 1 ? 's' : ''} in recycle bin</p>

      {TYPE_ORDER.filter(type => data[type].length > 0).map(type => (
        <div key={type} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <button
            onClick={() => setExpanded(prev => ({ ...prev, [type]: !prev[type] }))}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <div className="flex items-center gap-3">
              {expanded[type] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              <span className="font-semibold text-gray-800 dark:text-gray-100">{TYPE_LABELS[type]}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">{data[type].length}</span>
            </div>
          </button>

          {expanded[type] && (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {data[type].map(item => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4 bg-gray-50/40 dark:bg-gray-900/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Deleted {new Date(item.deleted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={loadingId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-xs font-medium transition disabled:opacity-50"
                    >
                      {loadingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Restore
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      disabled={loadingId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-medium transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Confirm permanent delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold">Permanently Delete?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This will <span className="font-semibold text-red-600">permanently remove</span> "{confirmDelete.label}" from the database. This action <span className="font-semibold">cannot be undone</span>.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmDelete)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
              >
                Yes, Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}