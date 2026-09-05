'use client'

const SCRIPT_TYPE_ORDER: Record<string, number> = {
  greeting: 1, upsell: 2, voice_note_script: 3, warranty_explanation: 4,
  payment: 5, after_sales: 6, objection_response: 7, follow_up: 8,
  closing: 9, cross_sell: 10, review_request: 11, whatsapp: 12,
}
function scriptTypePriority(type: string): number { return SCRIPT_TYPE_ORDER[type] ?? 99 }

import { useState, useTransition, useMemo, memo, useCallback } from 'react'
import { Plus, Edit, Trash2, Search, FileText, ChevronDown, ChevronRight, LayoutList, FolderTree, Loader2 } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ScriptFormModal } from '@/components/admin/ScriptFormModal'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { deleteScript, bulkSoftDeleteScripts, bulkPublishScripts } from '@/lib/actions/scripts'
import type { SalesScript } from '@/types'


const ScriptCardComponent = memo(({ script, isSelected, tabLang, setTabLang, copyCounts, onToggle, onEdit, onDelete, isPending }: { script: SalesScript, isSelected: boolean, tabLang: string, setTabLang: (lang: 'en' | 'hi') => void, copyCounts: Record<string, number>, onToggle: (id: string, checked: boolean) => void, onEdit: (script: SalesScript) => void, onDelete: (id: string) => void, isPending: boolean }) => {
    const displayContent = tabLang === 'hi' && script.content_hinglish ? script.content_hinglish : script.content
    const hasHinglish = !!script.content_hinglish

    return (
      <div key={script.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:border-gray-200 dark:hover:border-gray-600 transition shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={e => onToggle(script.id, e.target.checked)}
              onClick={e => e.stopPropagation()}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 mt-1 flex-shrink-0 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={script.status} />
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold uppercase">
                {script.script_type.replace(/_/g, ' ')}
              </span>
              {/* Language toggle pill */}
              <div className="flex items-center rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5 gap-0.5">
                <button
                  onClick={() => setTabLang('hi')}
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all ${
                    tabLang === 'hi' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Hinglish
                </button>
                <button
                  onClick={() => setTabLang('en')}
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all ${
                    tabLang === 'en' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  EN
                </button>
              </div>
              {tabLang === 'hi' && !hasHinglish && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">EN only</span>
              )}
              {copyCounts[script.id] > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                  📋 Copied {copyCounts[script.id]} times
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{script.title}</h3>
          </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(script)}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(script.id)}
              disabled={isPending}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {script.when_to_use && (
          <p className="text-xs text-brand-600 dark:text-brand-400 font-medium bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg inline-block">
            💡 When to use: {script.when_to_use}
          </p>
        )}
        <pre className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100 font-mono whitespace-pre-wrap leading-relaxed">
          {displayContent}
        </pre>
      </div>
    )
})
ScriptCardComponent.displayName = 'renderScriptCard'

export function ScriptManager({
  initialScripts,
  copyCounts,
  tools = [],
  initialToolId = ''
}: {
  initialScripts: SalesScript[]
  copyCounts: Record<string, number>
  tools?: { id: string; name: string }[]
  initialToolId?: string
}) {
  const handleToggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next; })
  }, [])

  const [scripts, setScripts] = useState(initialScripts)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [selectedScript, setSelectedScript] = useState<SalesScript | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, unknown> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [filterToolId, setFilterToolId] = useState(initialToolId)
  const [tabLang, setTabLang] = useState<'en' | 'hi'>('hi')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const scriptTypes = ['All', ...Array.from(new Set(scripts.map(s => s.script_type)))]

  const filtered = scripts.filter(s => {
    const matchesType = activeType === 'All' || s.script_type === activeType
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q) ||
      (s.when_to_use && s.when_to_use.toLowerCase().includes(q))
    const matchesTool = !filterToolId || s.tool_id === filterToolId
    return matchesType && matchesSearch && matchesTool
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; scripts: SalesScript[] }>()
    map.set('uncategorized', { name: 'Uncategorized', scripts: [] })
    tools.forEach(t => map.set(t.id, { name: t.name, scripts: [] }))

    filtered.forEach(s => {
      const key = s.tool_id && map.has(s.tool_id) ? s.tool_id : 'uncategorized'
      map.get(key)!.scripts.push(s)
    })

    return Array.from(map.entries())
      .filter(([_, v]) => v.scripts.length > 0)
      .map(([k, v]) => [k, { ...v, scripts: [...v.scripts].sort((a: any, b: any) => scriptTypePriority(a.script_type) - scriptTypePriority(b.script_type) || a.title.localeCompare(b.title)) }] as const)
      .sort((a, b) => b[1].scripts.length - a[1].scripts.length || a[1].name.localeCompare(b[1].name))
  }, [filtered, tools])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleCreate() {
    setAiDraft(null)
    setSelectedScript(null)
    setIsModalOpen(true)
  }

  const handleEdit = useCallback((script: SalesScript) => {
    setAiDraft(null)
    setSelectedScript(script)
    setIsModalOpen(true)
  }, [])

  function handleQuickCreate(data: Record<string, unknown>) {
    setAiDraft({ ...data, status: 'draft' })
    setSelectedScript(null)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setAiDraft(null)
  }

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return
    startTransition(async () => {
      const res = await deleteScript(id)
      if (!res.error) {
        setScripts(prev => prev.filter(s => s.id !== id))
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
      }
    })
  }, [])

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected scripts?`)) return
    setIsBulkDeleting(true)
    const ids = Array.from(selectedIds)
    const res = await bulkSoftDeleteScripts(ids)
    if (!res.error) {
      setScripts(prev => prev.filter(s => !selectedIds.has(s.id)))
      setSelectedIds(new Set())
    }
    setIsBulkDeleting(false)
  }

  async function handleBulkPublish() {
    if (!confirm(`Publish ${selectedIds.size} scripts?`)) return
    setIsBulkDeleting(true)
    const res = await bulkPublishScripts(Array.from(selectedIds))
    setIsBulkDeleting(false)
    if (!res.error) {
      setScripts(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, status: 'published' } : s))
      setSelectedIds(new Set())
    }
  }

  return (
    <div>
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search scripts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <select
            value={filterToolId}
            onChange={e => setFilterToolId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 [&>option]:text-gray-900 dark:[&>option]:text-gray-100"
          >
            <option value="" className="text-gray-900 dark:text-gray-100">All Tools</option>
            {tools.map(t => <option key={t.id} value={t.id} className="text-gray-900 dark:text-gray-100">{t.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mr-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
              title="Grouped by Tool"
            >
              <FolderTree className="w-4 h-4" />
            </button>
          </div>

          <QuickCreateButton
            contentType="script"
            onCreated={handleQuickCreate}
          />
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Script
          </button>
        </div>
      </div>

      {/* Script Type Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
        {scriptTypes.map(st => (
          <button
            key={st}
            onClick={() => setActiveType(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition flex-shrink-0 ${
              activeType === st
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          No sales scripts found.
        </div>
      ) : (
        viewMode === 'list' ? (
          <div className="space-y-4">
            {filtered.map(script => (
              <ScriptCardComponent
                key={script.id}
                script={script}
                isSelected={selectedIds.has(script.id)}
                tabLang={tabLang}
                setTabLang={setTabLang}
                copyCounts={copyCounts}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isPending={isPending}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([key, group]) => {
              const isExpanded = expandedGroups[key] !== false
              return (
                <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                      <span className="font-bold text-gray-900 dark:text-gray-100">{group.name}</span>
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                        {group.scripts.length}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                      {group.scripts.map(script => (
                        <ScriptCardComponent
                          key={script.id}
                          script={script}
                          isSelected={selectedIds.has(script.id)}
                          tabLang={tabLang}
                          setTabLang={setTabLang}
                          copyCounts={copyCounts}
                          onToggle={handleToggle}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isPending={isPending}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      <ScriptFormModal
        script={selectedScript}
        isOpen={isModalOpen}
        onClose={handleClose}
        defaultValues={aiDraft || undefined}
        tools={tools}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{selectedIds.size} selected</span>

          <button onClick={handleBulkPublish} disabled={isBulkDeleting} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50">
            {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Publish Selected
          </button>

          <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50">
            {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Selected
          </button>

          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
        </div>
      )}
    </div>
  )
}
