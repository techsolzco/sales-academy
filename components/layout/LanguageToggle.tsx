'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          'px-3 py-1 text-xs font-medium rounded-md transition-all',
          language === 'en'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50'
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('hi')}
        className={cn(
          'px-3 py-1 text-xs font-medium rounded-md transition-all',
          language === 'hi'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50'
        )}
      >
        Hinglish
      </button>
    </div>
  )
}
