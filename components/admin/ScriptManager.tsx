'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, FileText, ChevronDown, ChevronRight, LayoutList, FolderTree } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ScriptFormModal } from '@/components/admin/ScriptFormModal'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { deleteScript } from '@/lib/actions/scripts'
import type { SalesScript } from '@/types'

export function ScriptManager({
  initialScripts,
  copyCounts,
  tools = []
}: {
  initialScripts: SalesScript[]
  copyCounts: Record<string, number>
  tools?: { id: string; name: string }[]
}) {
  const [scripts, setScripts] = useState(initialScripts)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [selectedScript, setSelectedScript] = useState<SalesScript | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, unknown> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // For expanding/collapsing groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const scriptTypes = ['All', ...Array.from(new Set(scripts.map(s => s.script_type)))]

  const filtered = scripts.filter(s => {
    const matchesType = activeType === 'All' || s.script_type === activeType
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q) ||
      s.script_type.toLowerCase().includes(q)
    return matchesType && matchesSearch
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; scripts: SalesScript[] }>()
    map.set('uncategorized', { name: 'Uncategorized', scripts: [] })
    tools.forEach(t => map.set(t.id, { name: t.name, scripts: [] }))
    
    filtered.forEach(s => {
      const key = s.tool_id && map.has(s.tool_id) ? s.tool_id : 'uncategorized'
      map.get(key)!.scripts.push(s)
    })
    
    return Array.from(map.entries()).filter(([_, v]) => v.scripts.length > 0)
  }, [filtered, tools])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleCreate() {
    setAiDraft(null)
    setSelectedScript(null)
    setIsModalOpen(true)
  }

  function handleEdit(script: SalesScript) {
    setAiDraft(null)
    setSelectedScript(script)
    setIsModalOpen(true)
  }

  function handleQuickCreate(data: Record<string, unknown>) {
    setAiDraft({ ...data, status: 'draft' })
    setSelectedScript(null)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setAiDraft(null)
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this script?')) return
    startTransition(async () => {
      const res = await deleteScript(id)
      if (!res.error) {
        setScripts(prev => prev.filter(s => s.id !== id))
      }
    })
  }

  function renderScriptCard(script: SalesScript) {
    return (
      <div
        key={script.id}
        className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition shadow-sm space-y-3"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={script.status} />
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold uppercase">
                {script.script_type.replace(/_/g, ' ')}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                🗣️ {script.language}
              </span>
              {copyCounts[script.id] > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 font-semibold">
                  📋 Copied {copyCounts[script.id]} times
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-base">{script.title}</h3>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleEdit(script)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(script.id)}
              disabled={isPending}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {script.when_to_use && (
          <p className="text-xs text-brand-600 font-medium bg-brand-50/60 px-3 py-1.5 rounded-lg inline-block">
            💡 When to use: {script.when_to_use}
          </p>
        )}

        <pre className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-800 font-mono whitespace-pre-wrap leading-relaxed">
          {script.content}
        </pre>
      </div>
    )
  }

  return (
    <div>
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search scripts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
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

      {/* Script Type Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
        {scriptTypes.map(st => (
          <button
            key={st}
            onClick={() => setActiveType(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition flex-shrink-0 ${
              activeType === st
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No sales scripts found.
        </div>
      ) : (
        viewMode === 'list' ? (
          <div className="space-y-4">
            {filtered.map(renderScriptCard)}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([key, group]) => {
              const isExpanded = expandedGroups[key] !== false // true by default
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
                        {group.scripts.length}
                      </span>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white">
                      {group.scripts.map(renderScriptCard)}
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
      />
    </div>
  )
}
