'use client'

import { useState } from 'react'
import { Search, Copy, Check, HelpCircle } from 'lucide-react'
import type { FAQ } from '@/types'

export function SalesmanFAQViewer({ faqs }: { faqs: FAQ[] }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
    return matchesCat && matchesSearch
  })

  function handleCopy(faq: FAQ) {
    const textToCopy = faq.customer_ready_answer || faq.short_answer
    navigator.clipboard.writeText(textToCopy)
    setCopiedId(faq.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published FAQs found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(faq => (
            <div
              key={faq.id}
              id={`faq-${faq.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-brand-200 transition space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-brand-50 font-semibold text-brand-700 mb-2 inline-block">
                    {faq.category}
                  </span>
                  <h3 className="font-bold text-gray-900 text-base leading-snug">{faq.question}</h3>
                </div>

                <button
                  onClick={() => handleCopy(faq)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 font-semibold text-xs transition flex-shrink-0 shadow-sm"
                  title="Copy customer-ready answer"
                >
                  {copiedId === faq.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === faq.id ? 'Copied!' : 'Copy Answer'}
                </button>
              </div>

              {/* Answers */}
              <div className="space-y-3 pt-1">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Quick Answer</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/80 p-3 rounded-xl border border-gray-100">{faq.short_answer}</p>
                </div>

                {faq.customer_ready_answer && (
                  <div>
                    <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">Client-Ready Response</p>
                    <p className="text-sm text-gray-800 leading-relaxed bg-brand-50/40 p-3.5 rounded-xl border border-brand-100/60 font-sans">{faq.customer_ready_answer}</p>
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
          ))}
        </div>
      )}
    </div>
  )
}
