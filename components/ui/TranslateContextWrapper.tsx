'use client'

import { useState, useTransition, ReactNode } from 'react'
import { translateContent } from '@/lib/actions/translate'
import { Globe, Loader2 } from 'lucide-react'

interface TranslateContextProps {
  table: 'faqs' | 'objections' | 'scripts' | 'voice_notes'
  recordId: string
  fieldsToTranslate: Record<string, string>
  initialTranslations: Record<string, string | null | undefined>
  children: (props: {
    displayTexts: Record<string, string>
    isTranslated: boolean
    toggleButton: ReactNode
  }) => ReactNode
}

export function TranslateContextWrapper({
  table,
  recordId,
  fieldsToTranslate,
  initialTranslations,
  children
}: TranslateContextProps) {
  const [isTranslated, setIsTranslated] = useState(false)
  const [cachedTranslations, setCachedTranslations] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const [key, val] of Object.entries(initialTranslations)) {
      if (val) init[key] = val
    }
    return init
  })
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    if (isTranslated) {
      setIsTranslated(false)
      return
    }

    const missing: Record<string, string> = {}
    for (const [col, origText] of Object.entries(fieldsToTranslate)) {
      if (!cachedTranslations[col] && origText && origText.trim() !== '') {
        missing[col] = origText
      }
    }

    if (Object.keys(missing).length > 0) {
      startTransition(async () => {
        const res = await translateContent(table, recordId, missing)
        if (res.data) {
          setCachedTranslations(prev => ({ ...prev, ...res.data }))
        }
        setIsTranslated(true)
      })
    } else {
      setIsTranslated(true)
    }
  }

  const displayTexts: Record<string, string> = {}
  for (const [col, origText] of Object.entries(fieldsToTranslate)) {
    if (isTranslated) {
       displayTexts[col] = cachedTranslations[col] || origText || ''
    } else {
       displayTexts[col] = origText || ''
    }
  }

  const toggleButton = (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-md shadow-sm text-gray-600 hover:text-brand-600 hover:bg-gray-50 transition"
      title="Translate Content"
    >
      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
      {isTranslated ? '🌐 Hinglish' : '🌐 English'}
    </button>
  )

  return <>{children({ displayTexts, isTranslated, toggleButton })}</>
}
