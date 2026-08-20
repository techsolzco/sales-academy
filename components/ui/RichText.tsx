import React from 'react'

/**
 * Renders text with **word** → <mark> highlighting.
 * Use this everywhere AI-generated text is displayed.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  // Split on **word** pattern
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const word = part.slice(2, -2)
          return <mark key={i} className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-0.5 rounded font-semibold not-italic">{word}</mark>
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </span>
  )
}
