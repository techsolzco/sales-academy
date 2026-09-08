'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function TabLangToggle({ currentLang }: { currentLang: 'en' | 'hi' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const handleToggle = (lang: 'en' | 'hi') => {
    router.replace(`${pathname}?${createQueryString('lang', lang)}`, { scroll: false })
  }

  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
      <button
        onClick={() => handleToggle('en')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          currentLang === 'en'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => handleToggle('hi')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          currentLang === 'hi'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        Hinglish
      </button>
    </div>
  )
}
