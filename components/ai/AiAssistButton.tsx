'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, Send } from 'lucide-react'
import { aiAssistField } from '@/lib/actions/ai-assist'
import { AiContentType } from '@/types'

interface AiAssistButtonProps {
  contentType: AiContentType
  fieldName: string
  existingContext: string
  onResult: (text: string) => void
  className?: string
}

export function AiAssistButton({ contentType, fieldName, existingContext, onResult, className = '' }: AiAssistButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(false)
  
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!instruction.trim() || cooldown) return
    
    setIsLoading(true)
    setError(null)
    
    const result = await aiAssistField({
      contentType,
      fieldName,
      existingContext,
      instruction
    })
    
    setIsLoading(false)
    setCooldown(true)
    
    setTimeout(() => setCooldown(false), 3000)
    
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      onResult(result.data)
      setIsOpen(false)
      setInstruction('')
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={cooldown || isLoading}
        className="flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 px-2 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        ✨ AI
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            What should the AI generate?
          </label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={`e.g. Write a catchy title for a ${contentType}`}
            rows={2}
            className="w-full text-sm rounded-md border border-gray-200 p-2 focus:ring-violet-500 focus:border-violet-500"
            autoFocus
          />
          
          {error && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 p-1.5 rounded border border-red-100">
              {error}
            </div>
          )}
          
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !instruction.trim()}
              className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
