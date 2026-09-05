'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, XCircle, Eye, Check } from 'lucide-react'
import type { Objection } from '@/types'
import { toggleKbReview } from '@/lib/actions/kb-reviews'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TranslateContextWrapper } from '@/components/ui/TranslateContextWrapper'
import { RichText } from '@/components/ui/RichText'
import { ViewerSearchBar } from '@/components/training/ViewerSearchBar'

export function SalesmanObjectionViewer({ objections, tools = [], initialReviewed = [], initialToolId = '', initialLang }: { objections: Objection[], tools?: { id: string; name: string }[], initialReviewed?: string[], initialToolId?: string, initialLang?: 'en' | 'hi' }) {
  const [search, setSearch] = useState('')
  const [filterToolId, setFilterToolId] = useState(initialToolId)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set(initialReviewed))
  const [isPending, setIsPending] = useState(false)
  const { language: contextLang } = useLanguage()
  const [language, setLanguage] = useState(initialLang || contextLang || 'en')
  useEffect(() => { if (initialLang) setLanguage(initialLang) }, [initialLang])

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
    const matchesSearch =
      !q ||
      o.objection_text.toLowerCase().includes(q) ||
      o.recommended_response.toLowerCase().includes(q) ||
      (o.meaning && o.meaning.toLowerCase().includes(q))
    const matchesTool = !filterToolId || o.tool_id === filterToolId
    return matchesSearch && matchesTool
  })

  return (
    <div>
      {/* Search & Filter */}
      <div className="mb-6">
        <ViewerSearchBar
          search={search}
          onSearchChange={setSearch}
          filterToolId={filterToolId}
          onFilterToolChange={setFilterToolId}
          tools={tools}
          searchPlaceholder="Search objections (e.g. price, timing, competitor)…"
        />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          No published objection guides found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(o => (
            <TranslateContextWrapper
              key={o.id}
              table="objections"
              recordId={o.id}
              fieldsToTranslate={{
                recommended_response_translated: (language === 'hi' && o.recommended_response_hinglish ? o.recommended_response_hinglish : o.recommended_response),
                meaning_translated: o.meaning || '',
                do_not_say_translated: o.do_not_say || ''
              }}
              initialTranslations={{
                recommended_response_translated: o.recommended_response_translated,
                meaning_translated: o.meaning_translated,
                do_not_say_translated: o.do_not_say_translated
              }}
            >
              {({ displayTexts, toggleButton }) => (
                <div
                  id={`obj-${o.id}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 shadow-sm hover:border-brand-200 dark:hover:border-brand-700 transition space-y-3"
                >
                  {/* Top meta row: badges + toggleButton + Mark Reviewed — flex-wrap for mobile */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {o.difficulty && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-semibold text-gray-600 dark:text-gray-300 capitalize">
                        {o.difficulty}
                      </span>
                    )}
                    {o.related_product && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-900/30 font-semibold text-brand-700 dark:text-brand-300">
                        Product: {o.related_product}
                      </span>
                    )}
                    {toggleButton}
                    <button
                      onClick={() => handleToggleReview(o.id)}
                      disabled={isPending}
                      className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition shadow-sm flex-shrink-0 ${
                        reviewedIds.has(o.id)
                          ? 'border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {reviewedIds.has(o.id) ? (
                        <><Check className="w-3.5 h-3.5" /> Reviewed</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5" /> Mark Reviewed</>
                      )}
                    </button>
                  </div>
                  {/* Objection text — full card width */}
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">
                    &ldquo;{o.objection_text}&rdquo;
                    {language === 'hi' && !o.recommended_response_hinglish && <span className="text-xs text-gray-400 ml-2 font-normal">(EN only)</span>}
                  </h3>
                  {o.meaning && (
                    <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/25 border border-blue-100 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200">
                      💡 <span className="font-bold">Behind the objection:</span> <RichText text={displayTexts.meaning_translated || ''} />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        Recommended Response Strategy
                      </div>
                      <p className="text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed">
                        <RichText text={displayTexts.recommended_response_translated || ''} />
                      </p>
                    </div>
                    {o.do_not_say && (
                      <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-900/25 border border-red-100 dark:border-red-800/50 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          DO NOT SAY
                        </div>
                        <p className="text-sm text-red-950 dark:text-red-100 leading-relaxed"><RichText text={displayTexts.do_not_say_translated || ''} /></p>
                      </div>
                    )}
                  </div>
                  {o.alternative_response && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Alternative Response Option</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl"><RichText text={o.alternative_response || ''} /></p>
                    </div>
                  )}

                </div>
              )}
            </TranslateContextWrapper>
          ))}
        </div>
      )}
    </div>
  )
}
