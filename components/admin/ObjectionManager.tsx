'use client'

import { useState, useTransition, useMemo, memo, useCallback } from 'react'
import { Plus, Edit, Trash2, Search, AlertCircle, ChevronDown, ChevronRight, LayoutList, FolderTree, Loader2 } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ObjectionFormModal } from '@/components/admin/ObjectionFormModal'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { deleteObjection, bulkSoftDeleteObjections, bulkPublishObjections } from '@/lib/actions/objections'
import { TranslateContextWrapper } from '@/components/ui/TranslateContextWrapper'
import type { Objection } from '@/types'


const ObjectionCardComponent = memo(({ o, isSelected, onToggle, onEdit, onDelete, isPending }: { o: Objection, isSelected: boolean, onToggle: (id: string, checked: boolean) => void, onEdit: (o: Objection) => void, onDelete: (id: string) => void, isPending: boolean }) => {
    return (
      <TranslateContextWrapper
        key={o.id}
        table="objections"
        recordId={o.id}
        fieldsToTranslate={{
          recommended_response_translated: o.recommended_response
        }}
        initialTranslations={{
          recommended_response_translated: o.recommended_response_translated
        }}
      >
        {({ displayTexts, toggleButton }) => (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:border-gray-200 dark:hover:border-gray-600 transition space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={e => onToggle(o.id, e.target.checked)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 mt-1 flex-shrink-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <StatusBadge status={o.status} />
                  {o.difficulty && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-medium text-gray-600 dark:text-gray-300 capitalize">
                      {o.difficulty}
                    </span>
                  )}
                  {o.related_product && (
                    <span className="text-xs px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-900/30 font-medium text-brand-700 dark:text-brand-300">
                      {o.related_product}
                    </span>
                  )}
                  {o.category && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 font-medium text-purple-700 dark:text-purple-300">
                      {o.category}
                    </span>
                  )}
                  {toggleButton}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">&ldquo;{o.objection_text}&rdquo;</h3>
              </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(o)}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(o.id)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {o.meaning && (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-600">
                🔍 <span className="font-semibold text-gray-700 dark:text-gray-300">Underlying Meaning:</span> {o.meaning}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 space-y-1">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">✅ Recommended Response</p>
                <p className="text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed font-sans">{displayTexts.recommended_response_translated}</p>
              </div>
              {o.do_not_say && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 space-y-1">
                  <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">🚫 DO NOT SAY</p>
                  <p className="text-xs text-red-950 dark:text-red-100 leading-relaxed font-sans">{o.do_not_say}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </TranslateContextWrapper>
    )
})
ObjectionCardComponent.displayName = 'renderObjectionCard'

export function ObjectionManager({ initialObjections, tools = [], initialToolId }: { initialObjections: Objection[], tools?: { id: string; name: string }[], initialToolId?: string }) {
  const handleToggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next; })
  }, [])

  const [objections, setObjections] = useState(initialObjections)
  const [search, setSearch] = useState('')
  const [filterToolId, setFilterToolId] = useState(initialToolId || '')
  const [filterCategory, setFilterCategory] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [selectedObjection, setSelectedObjection] = useState<Objection | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, unknown> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const filtered = objections.filter(o => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      o.objection_text.toLowerCase().includes(q) ||
      o.recommended_response.toLowerCase().includes(q) ||
      (o.meaning && o.meaning.toLowerCase().includes(q))
    const matchesTool = !filterToolId || o.tool_id === filterToolId
    const matchesCategory = !filterCategory || o.category === filterCategory
    return matchesSearch && matchesTool && matchesCategory
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: Objection[] }>()
    map.set('uncategorized', { name: 'Uncategorized', items: [] })
    tools.forEach(t => map.set(t.id, { name: t.name, items: [] }))

    filtered.forEach(o => {
      const key = o.tool_id && map.has(o.tool_id) ? o.tool_id : 'uncategorized'
      map.get(key)!.items.push(o)
    })

    return Array.from(map.entries())
      .filter(([_, v]) => v.items.length > 0)
      .sort((a, b) => b[1].items.length - a[1].items.length || a[1].name.localeCompare(b[1].name))
  }, [filtered, tools])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleCreate() {
    setAiDraft(null)
    setSelectedObjection(null)
    setIsModalOpen(true)
  }

  const handleEdit = useCallback((objection: Objection) => {
    setAiDraft(null)
    setSelectedObjection(objection)
    setIsModalOpen(true)
  }, [])

  function handleQuickCreate(data: Record<string, unknown>) {
    setAiDraft({ ...data, status: 'draft' })
    setSelectedObjection(null)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setAiDraft(null)
  }

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Are you sure you want to delete this objection response?')) return
    startTransition(async () => {
      const res = await deleteObjection(id)
      if (!res.error) {
        setObjections(prev => prev.filter(o => o.id !== id))
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
      }
    })
  }, [])

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected objections?`)) return
    setIsBulkDeleting(true)
    const ids = Array.from(selectedIds)
    const res = await bulkSoftDeleteObjections(ids)
    if (!res.error) {
      setObjections(prev => prev.filter(o => !selectedIds.has(o.id)))
      setSelectedIds(new Set())
    }
    setIsBulkDeleting(false)
  }

  async function handleBulkPublish() {
    if (!confirm(`Publish ${selectedIds.size} objections?`)) return
    setIsBulkDeleting(true)
    const res = await bulkPublishObjections(Array.from(selectedIds))
    setIsBulkDeleting(false)
    if (!res.error) {
      setObjections(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, status: 'published' } : o))
      setSelectedIds(new Set())
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search objections or responses…"
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
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 [&>option]:text-gray-900 dark:[&>option]:text-gray-100"
          >
            <option value="" className="text-gray-900 dark:text-gray-100">All Categories</option>
            {Array.from(new Set(objections.map(o => o.category).filter(Boolean))).sort().map(cat => (
              <option key={cat} value={cat!} className="text-gray-900 dark:text-gray-100">{cat}</option>
            ))}
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
            contentType="objection"
            onCreated={handleQuickCreate}
          />
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Objection
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          No objections found.
        </div>
      ) : (
        viewMode === 'list' ? (
          <div className="space-y-4">
            {filtered.map(o => (
              <ObjectionCardComponent
                key={o.id}
                o={o}
                isSelected={selectedIds.has(o.id)}
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
                        {group.items.length}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                      {group.items.map(o => (
                        <ObjectionCardComponent
                          key={o.id}
                          o={o}
                          isSelected={selectedIds.has(o.id)}
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

      <ObjectionFormModal
        objection={selectedObjection}
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
