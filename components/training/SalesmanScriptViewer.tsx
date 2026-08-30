'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Copy, Check, FileText, Eye, ChevronDown, ChevronRight, LayoutList, FolderTree } from 'lucide-react'
import { logScriptCopy } from '@/lib/actions/scripts'
import type { SalesScript } from '@/types'
import { toggleKbReview } from '@/lib/actions/kb-reviews'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TranslateContextWrapper } from '@/components/ui/TranslateContextWrapper'
import { RichText } from '@/components/ui/RichText'

const SCRIPT_TYPE_ORDER: Record<string, number> = {
  greeting: 1,
  upsell: 2,
  voice_note_script: 3,
  warranty_explanation: 4,
  payment: 5,
  after_sales: 6,
  objection_response: 7,
  follow_up: 8,
  closing: 9,
  cross_sell: 10,
  review_request: 11,
  whatsapp: 12,
}
function scriptTypePriority(type: string): number {
  return SCRIPT_TYPE_ORDER[type] ?? 99
}

export function SalesmanScriptViewer({ scripts, tools = [], initialReviewed = [], initialToolId = '', initialLang }: { scripts: SalesScript[], tools?: { id: string; name: string }[], initialReviewed?: string[], initialToolId?: string, initialLang?: 'en' | 'hi' }) {
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<string>('All')
  const [filterToolId, setFilterToolId] = useState(initialToolId)
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set(initialReviewed))
  const [isPending, setIsPending] = useState(false)
  const { language: contextLang } = useLanguage()
  const [language, setLanguage] = useState(initialLang || contextLang || 'en')
  useEffect(() => { if (initialLang) setLanguage(initialLang) }, [initialLang])

  const scriptTypes = ['All', ...Array.from(new Set(scripts.map(s => s.script_type)))]

  const filtered = scripts.filter(s => {
    const matchesType = activeType === 'All' || s.script_type === activeType
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q) ||
      s.script_type.toLowerCase().includes(q)
    const matchesTool = !filterToolId || s.tool_id === filterToolId
    return matchesType && matchesSearch && matchesTool
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: SalesScript[] }>()
    map.set('uncategorized', { name: 'Uncategorized', items: [] })
    tools.forEach(t => map.set(t.id, { name: t.name, items: [] }))

    filtered.forEach(s => {
      const key = s.tool_id && map.has(s.tool_id) ? s.tool_id : 'uncategorized'
      map.get(key)!.items.push(s)
    })

    return Array.from(map.entries())
      .filter(([_, v]) => v.items.length > 0)
      .map(([k, v]) => [k, {
        ...v,
        items: [...v.items].sort((a, b) =>
          scriptTypePriority(a.script_type) - scriptTypePriority(b.script_type) ||
          a.title.localeCompare(b.title)
        )
      }] as const)
      .sort((a, b) => b[1].items.length - a[1].items.length || a[1].name.localeCompare(b[1].name))
  }, [filtered, tools])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleCopy(script: SalesScript) {
    navigator.clipboard.writeText(language === 'hi' && script.content_hinglish ? script.content_hinglish : script.content)
    setCopiedId(script.id)
    setTimeout(() => setCopiedId(null), 2000)
    await logScriptCopy(script.id)
  }

  async function handleToggleReview(id: string) {
    if (isPending) return
    setIsPending(true)
    const isReviewed = reviewedIds.has(id)
    try {
      await toggleKbReview('script', id, !isReviewed)
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

  function renderScriptCard(script: SalesScript) {
    return (
      <TranslateContextWrapper
        key={script.id}
        table="scripts"
        recordId={script.id}
        fieldsToTranslate={{
          content_translated: (language === 'hi' && script.content_hinglish ? script.content_hinglish : script.content),
          when_to_use_translated: script.when_to_use || ''
        }}
        initialTranslations={{
          content_translated: script.content_translated,
          when_to_use_translated: script.when_to_use_translated
        }}
      >
        {({ displayTexts, toggleButton }) => (
          <div
            id={`script-${script.id}`}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:border-brand-200 transition space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 font-bold text-blue-700 uppercase">
                    {script.script_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-medium text-gray-600 dark:text-gray-300">
                    🌐 {script.language}
                  </span>
                  {toggleButton}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  {script.title}
                  {language === 'hi' && !script.content_hinglish && <span className="text-xs text-gray-400 ml-2 font-normal">(EN only)</span>}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleReview(script.id)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition flex-shrink-0 shadow-sm ${
                    reviewedIds.has(script.id)
                      ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {reviewedIds.has(script.id) ? (
                    <><Check className="w-3.5 h-3.5" /> Reviewed</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> Mark Reviewed</>
                  )}
                </button>
                <button
                  onClick={() => handleCopy(script)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 font-semibold text-xs transition flex-shrink-0 shadow-sm"
                >
                  {copiedId === script.id ? <Check className="w-4 h-4 text-brand-600" /> : <Copy className="w-4 h-4" />}
                  {copiedId === script.id ? 'Copied!' : 'Copy Script'}
                </button>
              </div>
            </div>
            {script.when_to_use && (
              <p className="text-xs text-brand-700 font-medium bg-brand-50/80 px-3 py-1.5 rounded-lg border border-brand-100/50">
                💡 When to send: {language === 'hi' ? '(EN) ' : ''}{displayTexts.when_to_use_translated}
              </p>
            )}
            <p className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed select-all">
              <RichText text={displayTexts.content_translated || ''} />
            </p>
          </div>
        )}
      </TranslateContextWrapper>
    )
  }

  return (
    <div>
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search scripts by title or keyword…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filterToolId}
            onChange={e => setFilterToolId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Tools</option>
            {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'}`}
            title="List View"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'}`}
            title="Grouped by Tool"
          >
            <FolderTree className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
        {scriptTypes.map(st => (
          <button
            key={st}
            onClick={() => setActiveType(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition flex-shrink-0 ${
              activeType === st
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 text-sm">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published sales scripts found.
        </div>
      ) : (
        viewMode === 'list' ? (
          <div className="space-y-4">
            {filtered
              .slice()
              .sort((a, b) => scriptTypePriority(a.script_type) - scriptTypePriority(b.script_type) || a.title.localeCompare(b.title))
              .map(renderScriptCard)}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([key, group]) => {
              const isExpanded = expandedGroups[key] !== false
              return (
                <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                      <span className="font-bold text-gray-900 dark:text-gray-100">{group.name}</span>
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                        {group.items.length}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
                      {group.items.map(renderScriptCard)}
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
