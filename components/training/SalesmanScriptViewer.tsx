'use client'

import { useState } from 'react'
import { Search, Copy, Check, FileText } from 'lucide-react'
import { logScriptCopy } from '@/lib/actions/scripts'
import type { SalesScript } from '@/types'

export function SalesmanScriptViewer({ scripts }: { scripts: SalesScript[] }) {
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<string>('All')
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  async function handleCopy(script: SalesScript) {
    navigator.clipboard.writeText(script.content)
    setCopiedId(script.id)
    setTimeout(() => setCopiedId(null), 2000)

    // Log copy event to DB silently
    await logScriptCopy(script.id)
  }

  return (
    <div>
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search scripts by title or keyword…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published sales scripts found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(script => (
            <div
              key={script.id}
              id={`script-${script.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-brand-200 transition space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 font-bold text-blue-700 uppercase">
                      {script.script_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-600">
                      🌐 {script.language}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{script.title}</h3>
                </div>

                <button
                  onClick={() => handleCopy(script)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition flex-shrink-0 shadow-sm"
                >
                  {copiedId === script.id ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  {copiedId === script.id ? 'Copied!' : 'Copy Script'}
                </button>
              </div>

              {script.when_to_use && (
                <p className="text-xs text-brand-700 font-medium bg-brand-50/80 px-3 py-1.5 rounded-lg border border-brand-100/50">
                  💡 When to send: {script.when_to_use}
                </p>
              )}

              <pre className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-800 font-mono whitespace-pre-wrap leading-relaxed select-all">
                {script.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
