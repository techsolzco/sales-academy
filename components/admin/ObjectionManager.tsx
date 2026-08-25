'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, AlertCircle, ChevronDown, ChevronRight, LayoutList, FolderTree, Loader2 } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ObjectionFormModal } from '@/components/admin/ObjectionFormModal'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { deleteObjection, bulkSoftDeleteObjections } from '@/lib/actions/objections'
import { TranslateContextWrapper } from '@/components/ui/TranslateContextWrapper'
import type { Objection } from '@/types'

export function ObjectionManager({ initialObjections, tools = [], initialToolId }: { initialObjections: Objection[], tools?: { id: string; name: string }[], initialToolId?: string }) {
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

  function handleEdit(objection: Objection) {
    setAiDraft(null)
    setSelectedObjection(objection)
    setIsModalOpen(true)
  }

  function handleQuickCreate(data: Record<string, unknown>) {
    setAiDraft({ ...data, status: 'draft' })
    setSelectedObjection(null)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setAiDraft(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this objection response?')) return
    startTransition(async () => {
      const res = await deleteObjection(id)
      if (!res.error) {
        setObjections(prev => prev.filter(o => o.id !== id))
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
      }
    })
  }

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

  function renderObjectionCard(o: Objection) {
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
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-gray-200 transition space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(o.id)}
                  onChange={() => toggleSelect(o.id)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 mt-1 flex-shrink-0 cursor-pointer"
                />
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
                  {o.category && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-50 font-medium text-purple-700">
                      {o.category}
                    </span>
                  )}
                  {toggleButton}
                </div>
                <h3 className="font-bold text-gray-900 text-base">&ldquo;{o.objection_text}&rdquo;</h3>
              </div>
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
                <p className="text-xs text-emerald-950 leading-relaxed font-sans">{displayTexts.recommended_response_translated}</p>
              </div>
              {o.do_not_say && (
                <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-100 space-y-1">
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wider">🚫 DO NOT SAY</p>
                  <p className="text-xs text-red-950 leading-relaxed font-sans">{o.do_not_say}</p>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
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
          <select
            value={filterToolId}
            onChange={e => setFilterToolId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">All Tools</option>
            {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">All Categories</option>
            {Array.from(new Set(objections.map(o => o.category).filter(Boolean))).sort().map(cat => (
              <option key={cat} value={cat!}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl mr-2">
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
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No objections found.
        </div>
      ) : (
        viewMode === 'list' ? (
          <div className="space-y-4">
            {filtered.map(renderObjectionCard)}
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
                      {group.items.map(renderObjectionCard)}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50">
            {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete {selectedIds.size} selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
      )}
    </div>
  )
}
