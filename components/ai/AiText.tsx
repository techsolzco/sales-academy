'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * Strips ALL markdown asterisks from text and returns plain string.
 * Used for clipboard copy so paste into WhatsApp is clean.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **bold**
    .replace(/\*([^*]+)\*/g, '$1')        // *italic*
    .trim()
}

/**
 * Parses AI text into segments: plain text vs formerly-bold phrases.
 * Returns an array so we can render them differently.
 */
function parseSegments(text: string): Array<{ bold: boolean; text: string }> {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map(part => {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/)
    const italicMatch = part.match(/^\*([^*]+)\*$/)
    if (boldMatch) return { bold: true, text: boldMatch[1] }
    if (italicMatch) return { bold: true, text: italicMatch[1] }
    return { bold: false, text: part }
  }).filter(s => s.text.length > 0)
}

// ─── CopyButton ────────────────────────────────────────────────────────────────
interface CopyButtonProps {
  text: string
  label?: string
  /** Style variant — 'light' for use on white/gray bg, 'dark' for use on colored bg */
  variant?: 'light' | 'dark'
}

export function CopyButton({ text, label = 'Copy', variant = 'light' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(stripMarkdown(text))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const base = 'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all active:scale-95 select-none'
  const styles = {
    light: 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-400',
    dark:  'bg-white/20 hover:bg-white/30 text-white',
  }
  return (
    <button onClick={handle} className={`${base} ${styles[variant]}`}>
      {copied
        ? <><Check className="w-3 h-3" /> Copied!</>
        : <><Copy className="w-3 h-3" /> {label}</>
      }
    </button>
  )
}

// ─── AiText ────────────────────────────────────────────────────────────────────
interface AiTextProps {
  /** Raw AI output — may contain **bold** markdown markers */
  text: string
  /** Extra className for the outer wrapper */
  className?: string
  /** Show a copy button below the text */
  showCopy?: boolean
  /** Label for the copy button */
  copyLabel?: string
  /** Copy button variant */
  copyVariant?: 'light' | 'dark'
}

/**
 * Renders AI-generated text with:
 *  - No visible asterisks
 *  - Formerly-bold words shown with subtle amber highlight (no bold weight)
 *  - Optional copy button that copies clean plain text
 */
export function AiText({ text, className = '', showCopy = false, copyLabel = 'Copy', copyVariant = 'light' }: AiTextProps) {
  const segments = parseSegments(text)

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {segments.map((seg, i) =>
          seg.bold ? (
            <mark
              key={i}
              className="bg-amber-100/70 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 rounded px-0.5 font-normal not-italic"
              style={{ fontWeight: 'inherit' }}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>
      {showCopy && (
        <div className="flex justify-end pt-0.5">
          <CopyButton text={text} label={copyLabel} variant={copyVariant} />
        </div>
      )}
    </div>
  )
}
