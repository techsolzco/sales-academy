'use client'

import { Search } from 'lucide-react'

interface ViewerSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  filterToolId: string
  onFilterToolChange: (value: string) => void
  tools: { id: string; name: string }[]
  searchPlaceholder?: string
}

/**
 * Shared search input + tool filter dropdown used across all three
 * salesman viewer pages (Scripts, FAQs, Objections).
 * Single source of truth — fix here and all pages get it immediately.
 */
export function ViewerSearchBar({
  search,
  onSearchChange,
  filterToolId,
  onFilterToolChange,
  tools,
  searchPlaceholder = 'Search…',
}: ViewerSearchBarProps) {
  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800"
        />
      </div>

      {/* Tool filter — only rendered when there are tools to filter by */}
      {tools.length > 0 && (
        <select
          value={filterToolId}
          onChange={e => onFilterToolChange(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 [&>option]:text-gray-900 dark:[&>option]:text-gray-100 shrink-0"
        >
          <option value="" className="text-gray-900 dark:text-gray-100">All Tools</option>
          {tools.map(t => (
            <option key={t.id} value={t.id} className="text-gray-900 dark:text-gray-100">
              {t.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
