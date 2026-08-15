'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Check } from 'lucide-react'
import { quickCreateRecord } from '@/lib/actions/ai-assist'
import { AiContentType } from '@/types'

interface QuickCreateButtonProps {
  contentType: AiContentType
  onCreated: (data: Record<string, unknown>) => void
}

export function QuickCreateButton({ contentType, onCreated }: QuickCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null)
  const [cooldown, setCooldown] = useState(false)

  const handleGenerate = async () => {
    if (!description.trim() || cooldown) return
    
    setIsLoading(true)
    setError(null)
    setGeneratedData(null)
    
    const result = await quickCreateRecord({ contentType, description })
    
    setIsLoading(false)
    setCooldown(true)
    setTimeout(() => setCooldown(false), 3000)
    
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setGeneratedData(result.data)
    }
  }

  const handleUseDraft = () => {
    if (generatedData) {
      onCreated(generatedData)
      setIsOpen(false)
      setDescription('')
      setGeneratedData(null)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setDescription('')
    setGeneratedData(null)
    setError(null)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        ✨ Quick Create with AI
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                Quick Create {contentType} with AI
              </h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold p-2">
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {!generatedData ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe what you want to create
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-gray-300 p-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                      placeholder={`Describe the ${contentType} in a few words...`}
                      autoFocus
                    />
                  </div>
                  
                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleGenerate}
                      disabled={isLoading || !description.trim() || cooldown}
                      className="flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-200 font-medium text-center">
                    This will be saved as a DRAFT. Review the generated content below.
                  </div>
                  
                  <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                    {Object.entries(generatedData).map(([key, value]) => (
                      <div key={key} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                        <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {value.map((item, i) => (
                              <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700 font-medium">
                                {String(item)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900 bg-white p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">
                            {String(value)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <button
                      onClick={handleGenerate}
                      disabled={isLoading || cooldown}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Regenerate
                    </button>
                    
                    <button
                      onClick={handleUseDraft}
                      className="flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      ✅ Use This Draft
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
