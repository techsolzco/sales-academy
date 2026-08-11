'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Search, AlertCircle } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ObjectionFormModal } from '@/components/admin/ObjectionFormModal'
import { deleteObjection } from '@/lib/actions/objections'
import type { Objection } from '@/types'

export function ObjectionManager({ initialObjections }: { initialObjections: Objection[] }) {
  const [objections, setObjections] = useState(initialObjections)
  const [search, setSearch] = useState('')
  const [selectedObjection, setSelectedObjection] = useState<Objection | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = objections.filter(o => {
    const q = search.toLowerCase()
    return (
      !q ||
      o.objection_text.toLowerCase().includes(q) ||
      o.recommended_response.toLowerCase().includes(q) ||
      (o.meaning && o.meaning.toLowerCase().includes(q))
    )
  })

  function handleCreate() {
    setSelectedObjection(null)
    setIsModalOpen(true)
  }

  function handleEdit(objection: Objection) {
    setSelectedObjection(objection)
    setIsModalOpen(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this objection response?')) return
    startTransition(async () => {
      const res = await deleteObjection(id)
      if (!res.error) {
        setObjections(prev => prev.filter(o => o.id !== id))
      }
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search objections or responses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Objection
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No objections found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-gray-200 transition space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={o.status} />
                    {o.difficulty && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-600 capitalize">
                        {o.difficulty}
                      </span>
                    )}
                    {o.related_product && (
                      <span className="text-xs px-2 py-0.5 rounded bg-brand-50 font-medium text-brand-700">
                        {o.related_product}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">&ldquo;{o.objection_text}&rdquo;</h3>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(o)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(o.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {o.meaning && (
                <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">
                  🔍 <span className="font-semibold text-gray-700">Underlying Meaning:</span> {o.meaning}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">✅ Recommended Response</p>
                  <p className="text-xs text-emerald-950 leading-relaxed font-sans">{o.recommended_response}</p>
                </div>

                {o.do_not_say && (
                  <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-100 space-y-1">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider">🚫 DO NOT SAY</p>
                    <p className="text-xs text-red-950 leading-relaxed font-sans">{o.do_not_say}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ObjectionFormModal
        objection={selectedObjection}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
