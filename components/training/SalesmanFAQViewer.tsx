'use client'

import { useState, useMemo } from 'react'
import { Search, Copy, Check, HelpCircle, Eye, ChevronDown, ChevronRight, LayoutList, FolderTree } from 'lucide-react'
import type { FAQ } from '@/types'
import { toggleKbReview } from '@/lib/actions/kb-reviews'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TranslateContextWrapper } from '@/components/ui/TranslateContextWrapper'

export function SalesmanFAQViewer({ faqs, tools = [], initialReviewed = [] }: { faqs: FAQ[], tools?: { id: string; name: string }[], initialReviewed?: string[] }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [filterToolId, setFilterToolId] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set(initialReviewed))
  const [isPending, setIsPending] = useState(false)
  const { language } = useLanguage()

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))]

  const filtered = faqs.filter(f => {
    const matchesCat = activeCategory === 'All' || f.category === activeCategory
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      f.question.toLowerCase().includes(q) ||
      f.short_answer.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      (f.customer_ready_answer && f.customer_ready_answer.toLowerCase().includes(q))
    const matchesTool = !filterToolId || f.tool_id === filterToolId
    return matchesCat && matchesSearch && matchesTool
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: FAQ[] }>()
    map.set('uncategorized', { name: 'Uncategorized', items: [] })
    tools.forEach(t => map.set(t.id, { name: t.name, items: [] }))
    
    filtered.forEach(f => {
      const key = f.tool_id && map.has(f.tool_id) ? f.tool_id : 'uncategorized'
      map.get(key)!.items.push(f)
    })
    
    return Array.from(map.entries())
      .filter(([_, v]) => v.items.length > 0)
      .sort((a, b) => b[1].items.length - a[1].items.length || a[1].name.localeCompare(b[1].name))
  }, [filtered, tools])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleCopy(faq: FAQ) {
    const textToCopy = (language === 'hi' && faq.customer_ready_answer_hinglish) ? faq.customer_ready_answer_hinglish : (faq.customer_ready_answer || (language === 'hi' && faq.short_answer_hinglish ? faq.short_answer_hinglish : faq.short_answer))
    navigator.clipboard.writeText(textToCopy)
    setCopiedId(faq.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleToggleReview(id: string) {
    if (isPending) return
    setIsPending(true)
    const isReviewed = reviewedIds.has(id)
    try {
      await toggleKbReview('faq', id, !isReviewed)
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

  function renderFaqCard(faq: FAQ) {
    return (
      <TranslateContextWrapper
        key={faq.id}
        table="faqs"
        recordId={faq.id}
        fieldsToTranslate={{
          question_translated: (language === 'hi' && faq.question_hinglish ? faq.question_hinglish : faq.question),
          short_answer_translated: (language === 'hi' && faq.short_answer_hinglish ? faq.short_answer_hinglish : faq.short_answer),
          customer_ready_answer_translated: (language === 'hi' && faq.customer_ready_answer_hinglish ? faq.customer_ready_answer_hinglish : (faq.customer_ready_answer || ''))
        }}
        initialTranslations={{
          question_translated: faq.question_translated,
          short_answer_translated: faq.short_answer_translated,
          customer_ready_answer_translated: faq.customer_ready_answer_translated
        }}
      >
        {({ displayTexts, toggleButton }) => (
          <div
            id={`faq-${faq.id}`}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-brand-200 transition space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-brand-50 font-semibold text-brand-700 mb-2 inline-block">
                  {faq.category}
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base leading-snug">
                    {displayTexts.question_translated}
                    {language === 'hi' && !faq.question_hinglish && <span className="text-xs text-gray-400 ml-1">(EN only)</span>}
                  </h3>
                  {toggleButton}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleReview(faq.id)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition flex-shrink-0 shadow-sm ${
                    reviewedIds.has(faq.id) 
                      ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {reviewedIds.has(faq.id) ? (
                    <><Check className="w-3.5 h-3.5" /> Reviewed</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> Mark Reviewed</>
                  )}
                </button>
                <button
                  onClick={() => handleCopy(faq)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 font-semibold text-xs transition flex-shrink-0 shadow-sm"
                  title="Copy customer-ready answer"
                >
                  {copiedId === faq.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === faq.id ? 'Copied!' : 'Copy Answer'}
                </button>
              </div>
            </div>
            {/* Answers */}
            <div className="space-y-3 pt-1">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Quick Answer</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  {displayTexts.short_answer_translated}
                </p>
              </div>
              {faq.customer_ready_answer && (
                <div>
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">Client-Ready Response</p>
                  <p className="text-sm text-gray-800 leading-relaxed bg-brand-50/40 p-3.5 rounded-xl border border-brand-100/60 font-sans">
                    {displayTexts.customer_ready_answer_translated}
                  </p>
                </div>
              )}
              {faq.detailed_answer && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Internal Details</p>
                  <p className="text-xs text-gray-600 leading-relaxed italic">{faq.detailed_answer}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </TranslateContextWrapper>
    )
  }

  return (
    <div>
      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs by keyword or question…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            />
          </div>
          <select
            value={filterToolId}
            onChange={e => setFilterToolId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          >
            <option value="">All Tools</option>
            {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-900'}`}
            title="List View"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('grouped')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grouped' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-900'}`}
            title="Grouped by Tool"
          >
            <FolderTree className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
              activeCategory === cat
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published FAQs found.
        </div>
      ) : (
        viewMode === 'list' ? (
          <div className="space-y-4">
            {filtered.map(renderFaqCard)}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([key, group]) => {
              const isExpanded = expandedGroups[key] !== false
              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                      <span className="font-bold text-gray-900">{group.name}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {group.items.length}
                      </span>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white">
                      {group.items.map(renderFaqCard)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
