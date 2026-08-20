'use client'

import { useState, useTransition, useRef } from 'react'
import {
  AlignLeft, Heading, Image, Youtube, FileText, Link2,
  Quote, AlertCircle, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Loader2, Check, X, Edit3
} from 'lucide-react'
import { createContentBlock, updateContentBlock, deleteContentBlock, reorderContentBlocks } from '@/lib/actions/content-blocks'
import type { ContentBlock, ContentBlockType } from '@/types'

// ── Block type config ──────────────────────────────────────────────────────

const BLOCK_TYPES: { type: ContentBlockType; icon: React.ReactNode; label: string; description: string }[] = [
  { type: 'text',    icon: <AlignLeft className="w-5 h-5" />,    label: 'Text',      description: 'Rich text content' },
  { type: 'heading', icon: <Heading className="w-5 h-5" />,      label: 'Heading',   description: 'Section heading' },
  { type: 'image',   icon: <Image className="w-5 h-5" />,        label: 'Image',     description: 'Image with caption' },
  { type: 'youtube', icon: <Youtube className="w-5 h-5" />,      label: 'YouTube',   description: 'Embedded video' },
  { type: 'pdf',     icon: <FileText className="w-5 h-5" />,     label: 'PDF / Doc', description: 'Document link' },
  { type: 'link',    icon: <Link2 className="w-5 h-5" />,        label: 'Link',      description: 'External link' },
  { type: 'quote',   icon: <Quote className="w-5 h-5" />,        label: 'Quote',     description: 'Pull quote' },
  { type: 'callout', icon: <AlertCircle className="w-5 h-5" />,  label: 'Callout',   description: 'Info / warning box' },
]

// ── Block preview (read-only) ──────────────────────────────────────────────

function BlockPreview({ block }: { block: ContentBlock }) {
  const c = block.content as Record<string, string>
  switch (block.type) {
    case 'text':
      return <p className="text-sm text-gray-600 line-clamp-2">{c.body || <span className="italic text-gray-300">Empty text block</span>}</p>
    case 'heading':
      return <p className="text-sm font-semibold text-gray-800">H{c.level}: {c.text || <span className="italic text-gray-300">Empty heading</span>}</p>
    case 'image':
      return <p className="text-sm text-gray-500">🖼 {c.url || 'No URL set'}{c.caption ? ` — "${c.caption}"` : ''}</p>
    case 'youtube':
      return <p className="text-sm text-gray-500">▶ {c.title || 'YouTube video'}{c.videoId ? ` (${c.videoId})` : ''}</p>
    case 'pdf':
      return <p className="text-sm text-gray-500">📄 {c.filename || c.url || 'Document'}</p>
    case 'link':
      return <p className="text-sm text-blue-600 underline line-clamp-1">{c.label || c.url || 'Link'}</p>
    case 'quote':
      return <p className="text-sm italic text-gray-600 line-clamp-1">"{c.text}" {c.author ? `— ${c.author}` : ''}</p>
    case 'callout':
      return <p className="text-sm text-gray-600">[{c.variant?.toUpperCase()}] {c.title}: {c.body}</p>
    default:
      return null
  }
}

// ── Inline editors per block type ──────────────────────────────────────────

function BlockEditor({
  block,
  onSave,
  onCancel,
}: {
  block: ContentBlock
  onSave: (content: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const c = block.content as Record<string, string>
  const [local, setLocal] = useState<Record<string, string>>({ ...c as Record<string, string> })
  function set(key: string, value: string) { setLocal(p => ({ ...p, [key]: value })) }

  async function handleSave() {
    setSaving(true)
    await onSave(local)
    setSaving(false)
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  const fields: React.ReactNode = (() => {
    switch (block.type) {
      case 'text':
        return (
          <div>
            <label className={labelCls}>Body</label>
            <textarea rows={5} className={inputCls + ' resize-none'} value={local.body ?? ''} onChange={e => set('body', e.target.value)} placeholder="Enter text content…" />
          </div>
        )
      case 'heading':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Heading Text</label>
              <input className={inputCls} value={local.text ?? ''} onChange={e => set('text', e.target.value)} placeholder="Section heading" />
            </div>
            <div>
              <label className={labelCls}>Level</label>
              <select className={inputCls} value={local.level ?? '2'} onChange={e => set('level', e.target.value)}>
                <option value="1">H1 — Page title</option>
                <option value="2">H2 — Section</option>
                <option value="3">H3 — Subsection</option>
              </select>
            </div>
          </div>
        )
      case 'image':
        return (
          <div className="space-y-3">
            <div><label className={labelCls}>Image URL</label><input type="url" className={inputCls} value={local.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://…" /></div>
            <div><label className={labelCls}>Alt Text</label><input className={inputCls} value={local.alt ?? ''} onChange={e => set('alt', e.target.value)} placeholder="Describe the image" /></div>
            <div><label className={labelCls}>Caption</label><input className={inputCls} value={local.caption ?? ''} onChange={e => set('caption', e.target.value)} placeholder="Optional caption" /></div>
          </div>
        )
      case 'youtube':
        return (
          <div className="space-y-3">
            <div><label className={labelCls}>YouTube Video ID or URL</label><input className={inputCls} value={local.videoId ?? ''} onChange={e => set('videoId', e.target.value.replace(/.*v=/, '').replace(/&.*/, ''))} placeholder="dQw4w9WgXcQ or full URL" /></div>
            <div><label className={labelCls}>Title</label><input className={inputCls} value={local.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Video title" /></div>
          </div>
        )
      case 'pdf':
        return (
          <div className="space-y-3">
            <div><label className={labelCls}>Document URL</label><input type="url" className={inputCls} value={local.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://…/document.pdf" /></div>
            <div><label className={labelCls}>Display Name</label><input className={inputCls} value={local.filename ?? ''} onChange={e => set('filename', e.target.value)} placeholder="Sales Playbook Q4 2024.pdf" /></div>
          </div>
        )
      case 'link':
        return (
          <div className="space-y-3">
            <div><label className={labelCls}>URL</label><input type="url" className={inputCls} value={local.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://…" /></div>
            <div><label className={labelCls}>Label</label><input className={inputCls} value={local.label ?? ''} onChange={e => set('label', e.target.value)} placeholder="Click here to learn more" /></div>
            <div><label className={labelCls}>Description</label><input className={inputCls} value={local.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Optional context" /></div>
          </div>
        )
      case 'quote':
        return (
          <div className="space-y-3">
            <div><label className={labelCls}>Quote Text</label><textarea rows={3} className={inputCls + ' resize-none'} value={local.text ?? ''} onChange={e => set('text', e.target.value)} placeholder="The quote text…" /></div>
            <div><label className={labelCls}>Author</label><input className={inputCls} value={local.author ?? ''} onChange={e => set('author', e.target.value)} placeholder="— Author Name" /></div>
          </div>
        )
      case 'callout':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Variant</label>
              <select className={inputCls} value={local.variant ?? 'info'} onChange={e => set('variant', e.target.value)}>
                <option value="info">ℹ Info</option>
                <option value="warning">⚠ Warning</option>
                <option value="tip">💡 Tip</option>
                <option value="danger">🚨 Danger</option>
              </select>
            </div>
            <div><label className={labelCls}>Title</label><input className={inputCls} value={local.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Callout title" /></div>
            <div><label className={labelCls}>Body</label><textarea rows={3} className={inputCls + ' resize-none'} value={local.body ?? ''} onChange={e => set('body', e.target.value)} placeholder="Callout body text…" /></div>
          </div>
        )
      default:
        return null
    }
  })()

  return (
    <div className="mt-3 space-y-3">
      {fields}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-60 transition"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main ContentBlockEditor ────────────────────────────────────────────────

interface ContentBlockEditorProps {
  lessonId: string
  moduleId: string
  courseId: string
  initialBlocks: ContentBlock[]
}

export function ContentBlockEditor({ lessonId, moduleId, courseId, initialBlocks }: ContentBlockEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    [...initialBlocks].sort((a, b) => a.order_index - b.order_index)
  )
  const [showPicker, setShowPicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDraggingIndex, setIsDraggingIndex] = useState<number | null>(null)

  // ── Add block ────────────────────────────────────────────────────────────
  function handleAddBlock(type: ContentBlockType) {
    setShowPicker(false)
    startTransition(async () => {
      const result = await createContentBlock(lessonId, courseId, moduleId, type)
      if (!result.error && result.data) {
        setBlocks(prev => [...prev, result.data!])
        setEditingId(result.data!.id)
      }
    })
  }

  // ── Save block content ───────────────────────────────────────────────────
  async function handleSaveBlock(blockId: string, content: Record<string, unknown>) {
    const result = await updateContentBlock(blockId, lessonId, courseId, moduleId, content)
    if (!result.error && result.data) {
      setBlocks(prev => prev.map(b => b.id === blockId ? result.data! : b))
      setEditingId(null)
    }
  }

  // ── Delete block ─────────────────────────────────────────────────────────
  async function handleDelete(blockId: string) {
    setDeletingId(blockId)
    const result = await deleteContentBlock(blockId, lessonId, courseId, moduleId)
    setDeletingId(null)
    if (!result.error) {
      setBlocks(prev => prev.filter(b => b.id !== blockId))
    }
  }

  // ── Drag and drop ────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index
    setIsDraggingIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    const fromIndex = dragIndexRef.current
    dragIndexRef.current = null
    setDragOverIndex(null)
    if (fromIndex === null || fromIndex === dropIndex) return

    const updated = [...blocks]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(dropIndex, 0, moved)
    const withOrder = updated.map((b, i) => ({ ...b, order_index: i }))
    setBlocks(withOrder)
    startTransition(async () => {
      await reorderContentBlocks(lessonId, courseId, moduleId, withOrder.map(b => b.id))
    })
    setIsDraggingIndex(null)
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOverIndex(null)
    setIsDraggingIndex(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const typeConfig = Object.fromEntries(BLOCK_TYPES.map(b => [b.type, b]))

  return (
    <div>
      {/* Block list */}
      <div className="space-y-2">
        {blocks.length === 0 && (
          <div className="text-center py-12 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
            No content yet — add your first block below.
          </div>
        )}

        {blocks.map((block, index) => {
          const config = typeConfig[block.type]
          const isEditing = editingId === block.id
          const isDeleting = deletingId === block.id
          const isDragging = isDraggingIndex === index
          const isDragOver = dragOverIndex === index && !isDragging

          return (
            <div
              key={block.id}
              draggable
              onDragStart={e => handleDragStart(e, index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`rounded-xl border bg-white transition-all duration-150 ${
                isDragging ? 'opacity-50 scale-[1.02] shadow-2xl ring-2 ring-brand-400 rotate-1 z-10' : ''
              } ${
                isDragOver ? 'border-t-4 border-brand-400' : 'border-gray-100'
              } ${isEditing ? 'ring-2 ring-brand-300' : ''}`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-300 mt-0.5 flex-shrink-0">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Type icon + label */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center">
                  {config?.icon}
                </div>

                {/* Content preview */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    {config?.label}
                  </p>
                  <BlockPreview block={block} />

                  {/* Inline editor */}
                  {isEditing && (
                    <BlockEditor
                      block={block}
                      onSave={content => handleSaveBlock(block.id, content)}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(block.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(block.id)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                      title="Delete"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Block button + picker */}
      <div className="mt-4">
        {showPicker ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Choose a block type</p>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BLOCK_TYPES.map(bt => (
                <button
                  key={bt.type}
                  onClick={() => handleAddBlock(bt.type)}
                  disabled={isPending}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-brand-300 hover:bg-brand-50 transition disabled:opacity-50 text-center"
                >
                  <span className="text-brand-500">{bt.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{bt.label}</span>
                  <span className="text-xs text-gray-400 leading-tight">{bt.description}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-brand-300 hover:text-brand-500 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Content Block
          </button>
        )}
      </div>
    </div>
  )
}
