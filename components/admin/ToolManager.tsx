'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Search, Wrench, ExternalLink, Play } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ToolFormModal } from '@/components/admin/ToolFormModal'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { deleteTool } from '@/lib/actions/tools'
import type { Tool } from '@/types'

export function ToolManager({ initialTools }: { initialTools: Tool[] }) {
  const [tools, setTools] = useState(initialTools)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, unknown> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this tool?')) return
    startTransition(async () => {
      const res = await deleteTool(id)
      if (!res.error) {
        setTools(prev => prev.filter(t => t.id !== id))
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
                    {tool.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tool.logo_url} alt={tool.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                        {tool.name[0]}
                      </div>
                    )}

                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug">{tool.name}</h3>
                      <span className="text-xs text-brand-600 font-medium">{tool.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <StatusBadge status={tool.status} />
                    <button
                      onClick={() => handleEdit(tool)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tool.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
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
                {tool.pricing && (
                  <span className="font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg">
                    💰 {tool.pricing}
                  </span>
                )}
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
    </div>
  )
}
