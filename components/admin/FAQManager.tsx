'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Search, HelpCircle, Loader2 } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { FAQFormModal } from '@/components/admin/FAQFormModal'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { deleteFAQ } from '@/lib/actions/faqs'
import type { FAQ } from '@/types'

export function FAQManager({ initialFaqs }: { initialFaqs: FAQ[] }) {
  const [faqs, setFaqs] = useState(initialFaqs)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, unknown> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))]

  const filtered = faqs.filter(f => {
    const matchesCat = activeCategory === 'All' || f.category === activeCategory
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      f.question.toLowerCase().includes(q) ||
      f.short_answer.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })

  function handleCreate() {
    setAiDraft(null)
    setSelectedFaq(null)
    setIsModalOpen(true)
  }

  function handleEdit(faq: FAQ) {
    setAiDraft(null)
    setSelectedFaq(faq)
    setIsModalOpen(true)
  }

  function handleQuickCreate(data: Record<string, unknown>) {
    setAiDraft({ ...data, status: 'draft' })
    setSelectedFaq(null)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setAiDraft(null)
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this FAQ?')) return
    startTransition(async () => {
      const res = await deleteFAQ(id)
      if (!res.error) {
        setFaqs(prev => prev.filter(f => f.id !== id))
      }
    })
  }

  return (
    <div>
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <QuickCreateButton
            contentType="faq"
            onCreated={handleQuickCreate}
          />
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add FAQ
          </button>
        </div>
      </div>

      {/* Category Pills */}
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

      {/* FAQ Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No FAQs match your search.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(faq => (
            <div
              key={faq.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={faq.status} />
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-600">
                      {faq.category}
                    </span>
                    {faq.priority > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-50 font-medium text-amber-700">
                        Priority: {faq.priority}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 text-base">{faq.question}</h3>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(faq)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
                    title="Edit FAQ"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                    title="Delete FAQ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Short Answer</span>
                  <p className="text-gray-800 bg-gray-50/80 p-3 rounded-xl border border-gray-100">{faq.short_answer}</p>
                </div>

                {faq.customer_ready_answer && (
                  <div>
                    <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider block mb-0.5">Customer-Ready Answer</span>
                    <p className="text-gray-800 bg-brand-50/50 p-3 rounded-xl border border-brand-100/50 font-sans">{faq.customer_ready_answer}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <FAQFormModal
        faq={selectedFaq}
        isOpen={isModalOpen}
        onClose={handleClose}
        defaultValues={aiDraft || undefined}
      />
    </div>
  )
}
