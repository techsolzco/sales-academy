'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, BookOpen, FileText, Mic, AlertCircle, Wrench, HelpCircle, ArrowRight } from 'lucide-react'
import { globalSearch } from '@/lib/actions/search'
import type { SearchResultItem } from '@/types'

const typeIcons: Record<SearchResultItem['type'], React.ReactNode> = {
  faq: <HelpCircle className="w-4 h-4 text-purple-500" />,
  script: <FileText className="w-4 h-4 text-blue-500" />,
  voice_note: <Mic className="w-4 h-4 text-amber-500" />,
  objection: <AlertCircle className="w-4 h-4 text-red-500" />,
  tool: <Wrench className="w-4 h-4 text-emerald-500" />,
  lesson: <BookOpen className="w-4 h-4 text-brand-500" />,
}

const typeLabels: Record<SearchResultItem['type'], string> = {
  faq: 'FAQ',
  script: 'Script',
  voice_note: 'Voice Note',
  objection: 'Objection',
  tool: 'Tool',
  lesson: 'Lesson',
}

export function GlobalSearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      const res = await globalSearch(q)
      setResults(res.data)
      setIsLoading(false)
      setIsOpen(true)
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(url: string) {
    setIsOpen(false)
    setQuery('')
    router.push(url)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white dark:focus:bg-gray-800 transition"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />
        )}
      </div>

      {isOpen && (
        <div className="fixed sm:absolute top-14 sm:top-full left-3 right-3 sm:left-0 sm:right-0 mt-1 sm:mt-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden z-50 animate-fade-in max-h-[75vh] sm:max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item.url)}
                  className="w-full text-left p-3.5 hover:bg-brand-50/50 transition flex items-start gap-3 group"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 group-hover:bg-white dark:group-hover:bg-gray-600 transition">
                    {typeIcons[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400">
                        {typeLabels[item.type]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 transition self-center flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
