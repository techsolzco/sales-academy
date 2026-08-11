'use client'

import { useState } from 'react'
import { Search, ExternalLink, Copy, Check, Play, Wrench, X } from 'lucide-react'
import type { Tool } from '@/types'

export function SalesmanToolViewer({ tools }: { tools: Tool[] }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)

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

  function handleCopyLink(tool: Tool) {
    if (!tool.website_url) return
    navigator.clipboard.writeText(tool.website_url)
    setCopiedId(tool.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getEmbedUrl(urlStr: string): string {
    const videoId = urlStr.replace(/.*v=/, '').replace(/.*youtu\.be\//, '').replace(/&.*/, '')
    return `https://www.youtube.com/embed/${videoId}`
  }

  return (
    <div>
      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search AI, video, design & sales tools…"
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
          <Wrench className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published tools found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(tool => (
            <div
              key={tool.id}
              id={`tool-${tool.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-brand-200 transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {tool.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tool.logo_url} alt={tool.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {tool.name[0]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                      {tool.category}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base leading-snug truncate mt-1">{tool.name}</h3>
                  </div>
                </div>

                {tool.description && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{tool.description}</p>
                )}

                {tool.best_for && (
                  <p className="text-xs text-brand-700 bg-brand-50/60 p-2.5 rounded-lg border border-brand-100/50 font-medium">
                    🎯 Best for: {tool.best_for}
                  </p>
                )}

                {tool.features && tool.features.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Key Features</p>
                    <div className="flex flex-wrap gap-1">
                      {tool.features.map((f, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs mb-2">
                  <span className="text-gray-500 font-medium">Pricing: <strong className="text-gray-900">{tool.pricing || 'Free'}</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {tool.website_url && (
                    <a
                      href={tool.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition shadow-sm"
                    >
                      Open Tool <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {tool.website_url && (
                    <button
                      onClick={() => handleCopyLink(tool)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition"
                    >
                      {copiedId === tool.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === tool.id ? 'Copied!' : 'Copy Link'}
                    </button>
                  )}
                </div>

                {tool.youtube_tutorial_link && (
                  <button
                    onClick={() => setActiveVideoUrl(getEmbedUrl(tool.youtube_tutorial_link!))}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-xs transition border border-red-100"
                  >
                    <Play className="w-3.5 h-3.5 fill-red-600" /> Watch Video Tutorial
                  </button>
                )}

                {!tool.youtube_tutorial_link && tool.tutorial_link && (
                  <a
                    href={tool.tutorial_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition border border-gray-200"
                  >
                    Watch Tutorial <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl overflow-hidden w-full max-w-3xl aspect-video relative shadow-2xl">
            <button
              onClick={() => setActiveVideoUrl(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={activeVideoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  )
}
