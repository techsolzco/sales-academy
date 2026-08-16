'use client'

import { useState } from 'react'
import { Search, AlertCircle, CheckCircle, XCircle, Eye, Check } from 'lucide-react'
import type { Objection } from '@/types'
import { toggleKbReview } from '@/lib/actions/kb-reviews'

export function SalesmanObjectionViewer({ objections, initialReviewed = [] }: { objections: Objection[], initialReviewed?: string[] }) {
  const [search, setSearch] = useState('')
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set(initialReviewed))
  const [isPending, setIsPending] = useState(false)

  async function handleToggleReview(id: string) {
    if (isPending) return
    setIsPending(true)
    const isReviewed = reviewedIds.has(id)
    try {
      await toggleKbReview('objection', id, !isReviewed)
      const next = new Set(reviewedIds)
      if (isReviewed) next.delete(id)
      else next.add(id)
      setReviewedIds(next)
    } catch (e) {
      console.error(e)
    } finally {
      setIsPending(false)
    }
  }

  const filtered = objections.filter(o => {
    const q = search.toLowerCase()
    return (
      !q ||
      o.objection_text.toLowerCase().includes(q) ||
      o.recommended_response.toLowerCase().includes(q) ||
      (o.meaning && o.meaning.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {/* Search */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search objections (e.g. price, timing, competitor)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          />
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published objection guides found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(o => (
            <div
              key={o.id}
              id={`obj-${o.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-brand-200 transition space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {o.difficulty && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-gray-100 font-semibold text-gray-600 capitalize">
                        {o.difficulty}
                      </span>
                    )}
                    {o.related_product && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-brand-50 font-semibold text-brand-700">
                        Product: {o.related_product}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">&ldquo;{o.objection_text}&rdquo;</h3>
                </div>

                <button
                  onClick={() => handleToggleReview(o.id)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition flex-shrink-0 shadow-sm ${
                    reviewedIds.has(o.id) 
                      ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {reviewedIds.has(o.id) ? (
                    <><Check className="w-3.5 h-3.5" /> Reviewed</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> Mark Reviewed</>
                  )}
                </button>
              </div>

              {o.meaning && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900">
                  💡 <span className="font-bold">Behind the objection:</span> {o.meaning}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    Recommended Response Strategy
                  </div>
                  <p className="text-sm text-emerald-950 leading-relaxed">{o.recommended_response}</p>
                </div>

                {o.do_not_say && (
                  <div className="p-4 rounded-xl bg-red-50/70 border border-red-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 uppercase tracking-wider">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      DO NOT SAY
                    </div>
                    <p className="text-sm text-red-950 leading-relaxed">{o.do_not_say}</p>
                  </div>
                )}
              </div>

              {o.alternative_response && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Alternative Response Option</p>
                  <p className="text-xs text-gray-700 leading-relaxed italic bg-gray-50 p-3 rounded-xl">{o.alternative_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
