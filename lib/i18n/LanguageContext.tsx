'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, Lang } from './translations'
import { fetchPreferences, upsertPreferences } from '@/lib/actions/profile'

interface LanguageContextType {
  language: Lang
  setLanguage: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>('en')

  useEffect(() => {
    async function loadPref() {
      const pref = await fetchPreferences()
      if (pref?.language) {
        // Migrate old 'ur' preference to 'hi' (Hinglish)
        const lang = pref.language === 'ur' ? 'hi' : pref.language as Lang
        setLanguageState(lang)
      }
    }
    loadPref()
  }, [])

  // Always LTR — layout never changes regardless of language
  useEffect(() => {
    document.documentElement.dir = 'ltr'
  }, [])

  const setLanguage = async (l: Lang) => {
    setLanguageState(l)
    await upsertPreferences(l)
  }

  const t = (key: string): string => {
    if (translations[language]?.[key]) {
      return translations[language][key]
    }
    if (translations.en[key]) {
      return translations.en[key]
    }
    return key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    // Safe fallback — returns English without crashing
    return {
      language: 'en',
      setLanguage: async () => {},
      t: (key: string) => translations.en[key] ?? key,
    }
  }
  return context
}
