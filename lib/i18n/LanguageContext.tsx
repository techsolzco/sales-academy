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
        setLanguageState(pref.language as Lang)
      }
    }
    loadPref()
  }, [])

  useEffect(() => {
    if (language === 'ur') {
      document.documentElement.dir = 'rtl'
    } else {
      document.documentElement.dir = 'ltr'
    }
  }, [language])

  const setLanguage = async (l: Lang) => {
    setLanguageState(l)
    await upsertPreferences(l)
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let translation = translations[language] as any
    let defaultTranslation = translations.en as any
    
    // Simplistic access for flat or nested, but translations object is flat Record<string, string>
    if (translations[language][key]) {
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

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
