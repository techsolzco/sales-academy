'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { markLessonComplete } from '@/lib/actions/lessons'
import type { ContentBlock } from '@/types'

// ── Block renderers ────────────────────────────────────────────────────────

function TextBlock({ content }: { content: Record<string, unknown> }) {
  const body = String(content.body ?? '')
  return (
    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
      {body}
    </div>
  )
}

function HeadingBlock({ content }: { content: Record<string, unknown> }) {
  const level = Number(content.level ?? 2)
  const text = String(content.text ?? '')
  if (level === 1) return <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-2">{text}</h1>
  if (level === 2) return <h2 className="text-xl font-bold text-gray-800 mt-5 mb-2">{text}</h2>
  return <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-1">{text}</h3>
}

function ImageBlock({ content }: { content: Record<string, unknown> }) {
  const url = String(content.url ?? '')
  const alt = String(content.alt ?? '')
  const caption = content.caption ? String(content.caption) : null
  if (!url) return null
  return (
    <figure className="my-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="rounded-xl w-full object-cover max-h-96" />
      {caption && (
        <figcaption className="text-center text-xs text-gray-400 mt-2">{caption}</figcaption>
      )}
    </figure>
  )
}

function YoutubeBlock({ content }: { content: Record<string, unknown> }) {
  const videoId = String(content.videoId ?? '')
  const title = content.title ? String(content.title) : null
  if (!videoId) return null
  return (
    <div className="my-2">
      {title && <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}

function PdfBlock({ content }: { content: Record<string, unknown> }) {
  const url = String(content.url ?? '#')
  const filename = String(content.filename ?? 'Document')
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition"
    >
      <span className="text-2xl">📄</span>
      <div>
        <p className="text-sm font-medium text-gray-800">{filename}</p>
        <p className="text-xs text-brand-600">Click to open →</p>
      </div>
    </a>
  )
}

function LinkBlock({ content }: { content: Record<string, unknown> }) {
  const url = String(content.url ?? '#')
  const label = String(content.label ?? content.url ?? 'Link')
  const description = content.description ? String(content.description) : null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition"
    >
      <span className="text-2xl">🔗</span>
      <div>
        <p className="text-sm font-medium text-brand-600">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
    </a>
  )
}

function QuoteBlock({ content }: { content: Record<string, unknown> }) {
  const text = String(content.text ?? '')
  const author = content.author ? String(content.author) : null
  return (
    <blockquote className="border-l-4 border-brand-400 pl-4 py-2 my-2 bg-brand-50 rounded-r-xl">
      <p className="text-gray-700 italic text-sm leading-relaxed">&ldquo;{text}&rdquo;</p>
      {author && (
        <p className="text-xs text-gray-400 mt-1 font-medium">— {author}</p>
      )}
    </blockquote>
  )
}

const calloutStyles: Record<string, { bg: string; border: string; icon: string }> = {
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: 'ℹ️' },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200', icon: '⚠️' },
  tip:     { bg: 'bg-green-50',  border: 'border-green-200', icon: '💡' },
  danger:  { bg: 'bg-red-50',    border: 'border-red-200',   icon: '🚨' },
}

function CalloutBlock({ content }: { content: Record<string, unknown> }) {
  const variant = String(content.variant ?? 'info')
  const style = calloutStyles[variant] ?? calloutStyles.info
  const title = content.title ? String(content.title) : null
  const body = String(content.body ?? '')
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${style.bg} ${style.border}`}>
      <span className="text-xl flex-shrink-0">{style.icon}</span>
      <div>
        {title && <p className="text-sm font-semibold text-gray-800 mb-0.5">{title}</p>}
        <p className="text-sm text-gray-700 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function renderBlock(block: ContentBlock) {
  const c = block.content
  switch (block.type) {
    case 'text':    return <TextBlock content={c} />
    case 'heading': return <HeadingBlock content={c} />
    case 'image':   return <ImageBlock content={c} />
    case 'youtube': return <YoutubeBlock content={c} />
    case 'pdf':     return <PdfBlock content={c} />
    case 'link':    return <LinkBlock content={c} />
    case 'quote':   return <QuoteBlock content={c} />
    case 'callout': return <CalloutBlock content={c} />
    default: return null
  }
}

// ── Main viewer ────────────────────────────────────────────────────────────

interface LessonViewerProps {
  lessonId: string
  courseId: string
  blocks: ContentBlock[]
  isCompleted: boolean
}

export function LessonViewer({ lessonId, courseId, blocks, isCompleted }: LessonViewerProps) {
  const [completed, setCompleted] = useState(isCompleted)
  const [isPending, startTransition] = useTransition()

  function handleMarkComplete() {
    startTransition(async () => {
      const result = await markLessonComplete(lessonId, courseId)
      if (!result.error) setCompleted(true)
    })
  }

  return (
    <div>
      {/* Content blocks */}
      <div className="space-y-5">
        {blocks.length === 0 && (
          <p className="text-gray-400 text-sm italic py-8 text-center">
            Content for this lesson will be added soon.
          </p>
        )}
        {blocks.map(block => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </div>

      {/* Mark as complete button */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        {completed ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle className="w-5 h-5" /> Lesson completed!
          </div>
        ) : (
          <button
            onClick={handleMarkComplete}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-60 transition"
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><CheckCircle className="w-4 h-4" /> Mark as Complete</>
            }
          </button>
        )}
      </div>
    </div>
  )
}
