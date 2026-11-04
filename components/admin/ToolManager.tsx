'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Search, Wrench, ExternalLink, TreeDeciduous } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ToolFormModal } from '@/components/admin/ToolFormModal'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { deleteTool, bulkSoftDeleteTools } from '@/lib/actions/tools'
import type { Tool } from '@/types'

export function ToolManager({ initialTools }: { initialTools: Tool[] }) {
  const router = useRouter()
  const [tools, setTools] = useState(initialTools)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, unknown> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'single' | 'bulk'
    id?: string
    name?: string
    count?: number
  } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const categories = ['All', ...Array.from(new Set(tools.map(t => t.category)))]

  const filtered = tools.filter(t => {
    const matchesCat = activeCategory === 'All' || t.category === activeCategory
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.category.toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })

  function handleCreate() {
    setAiDraft(null)
    setSelectedTool(null)
    setIsModalOpen(true)
  }

  function handleEdit(tool: Tool) {
    setAiDraft(null)
    setSelectedTool(tool)
    setIsModalOpen(true)
  }

  function handleQuickCreate(data: Record<string, unknown>) {
    setAiDraft({ ...data, status: 'draft' })
    setSelectedTool(null)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setAiDraft(null)
  }

  function requestDelete(tool: Tool) {
    setDeleteError(null)
    setDeleteTarget({ type: 'single', id: tool.id, name: tool.name })
  }

  function requestBulkDelete() {
    setDeleteError(null)
    setDeleteTarget({ type: 'bulk', count: selectedIds.size })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        const res = await deleteTool(deleteTarget.id)
        if (res.error) {
          setDeleteError(res.error)
          setIsDeleting(false)
          return
        }
        setTools(prev => prev.filter(t => t.id !== deleteTarget.id))
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(deleteTarget.id!)
          return next
        })
      } else if (deleteTarget.type === 'bulk') {
        const ids = Array.from(selectedIds)
        const res = await bulkSoftDeleteTools(ids)
        if (res.error) {
          setDeleteError(res.error)
          setIsDeleting(false)
          return
        }
        setTools(prev => prev.filter(t => !selectedIds.has(t.id)))
        setSelectedIds(new Set())
      }
      setIsDeleting(false)
      setDeleteTarget(null)
      router.refresh()
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete')
      setIsDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
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
            placeholder="Search sales & AI tools…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <QuickCreateButton
            contentType="tool"
            onCreated={handleQuickCreate}
          />
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Tool
          </button>
        </div>
      </div>

      {/* Category Filter */}
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <Wrench className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No tools found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(tool => (
            <div key={tool.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-gray-200 transition space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tool.id)}
                      onChange={() => toggleSelect(tool.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 flex-shrink-0 cursor-pointer"
                    />
                    {tool.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tool.logo_url} alt={tool.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                        {tool.name[0]}
                      </div>
                    )}

                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">{tool.name}</h3>
                      <span className="text-xs text-brand-600 font-medium">{tool.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <StatusBadge status={tool.status} />
                    <button
                      onClick={() => handleEdit(tool)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
                      title="Edit Tool"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => requestDelete(tool)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                      title="Delete Tool"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {tool.description && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-2">{tool.description}</p>
                )}

                {tool.features && tool.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tool.features.slice(0, 3).map((f, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {tool.pricing && (
                    <span className="font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg">
                      💰 {tool.pricing}
                    </span>
                  )}
                  <Link
                    href={`/admin/tools/${tool.id}/tree`}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                  >
                    <TreeDeciduous className="w-3 h-3" /> View Tree
                  </Link>
                </div>
                {tool.website_url && (
                  <a
                    href={tool.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-600 font-medium hover:underline ml-auto"
                  >
                    Visit Site <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ToolFormModal
        tool={selectedTool}
        isOpen={isModalOpen}
        onClose={handleClose}
        defaultValues={aiDraft || undefined}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">{selectedIds.size} selected</span>
          <button
            onClick={requestBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedIds.size} selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'bulk' ? `Delete ${deleteTarget.count} Tools` : 'Delete Tool'}
        message="Are you sure? This cannot be undone."
        itemTitle={deleteTarget?.type === 'single' ? deleteTarget.name : undefined}
        isDeleting={isDeleting}
        error={deleteError}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      />
    </div>
  )
}
