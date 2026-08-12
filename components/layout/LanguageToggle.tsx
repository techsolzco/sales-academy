'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center rounded-lg bg-gray-100 p-1">
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          'px-3 py-1 text-xs font-medium rounded-md transition-all',
          language === 'en'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ur')}
        className={cn(
          'px-3 py-1 text-xs font-medium rounded-md transition-all',
          language === 'ur'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
        )}
      >
        اردو
      </button>
    </div>
  )
}
