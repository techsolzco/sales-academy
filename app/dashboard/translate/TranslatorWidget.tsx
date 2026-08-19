'use client'

import { useState } from 'react'
import { universalTranslate } from '@/lib/actions/universal-translate'
import { Languages, Loader2, Copy, Check, ArrowRight } from 'lucide-react'

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Hinglish (Roman Urdu)', label: 'Hinglish (Roman Urdu)' },
  { value: 'Urdu (اردو)', label: 'Urdu (اردو)' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' }
]

export function TranslatorWidget() {
  const [sourceText, setSourceText] = useState('')
  const [targetLang, setTargetLang] = useState('English')
  const [translatedText, setTranslatedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleTranslate = async () => {
    if (!sourceText.trim()) return
    setIsLoading(true)
    setError(null)
    setTranslatedText('')
    
    const result = await universalTranslate(sourceText, targetLang)
    
    setIsLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setTranslatedText(result.data)
    }
  }

  const handleCopy = () => {
    if (!translatedText) return
    navigator.clipboard.writeText(translatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col gap-6 p-6">
      
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Text */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Original Text
          </label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste text to translate here..."
            className="w-full h-48 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm focus:border-brand-500 focus:ring-brand-500 shadow-inner resize-none text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Translation Output */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Translate to
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500 text-gray-900 dark:text-gray-100"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative w-full h-48 rounded-xl border border-gray-200 dark:border-gray-600 bg-brand-50 dark:bg-gray-900 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-brand-600 dark:text-brand-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-medium">Translating...</span>
              </div>
            ) : translatedText ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {translatedText}
                </div>
                <div className="p-2 bg-brand-100/50 dark:bg-gray-800 border-t border-brand-200/50 dark:border-gray-700 flex justify-end">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-md border border-brand-200 dark:border-gray-600 shadow-sm transition-all"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
                <Languages className="w-8 h-8 opacity-50" />
                <span className="text-sm">Translation will appear here</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center border-t border-gray-100 dark:border-gray-700 pt-6">
        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isLoading}
          className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 text-sm font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Languages className="w-5 h-5" />}
          Translate Now
        </button>
      </div>

    </div>
  )
}
