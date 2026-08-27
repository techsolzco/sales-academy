'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createAssignment, updateAssignment, saveAssignmentContentItems } from '@/lib/actions/assignments'
import type { ContentItem } from '@/lib/actions/assignments'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'

interface Tool { id: string; name: string }
interface Quiz { id: string; title: string; tool_id: string | null }

interface Props {
  assignmentId?: string | null
  initialData?: any
  tools: Tool[]
  quizzes: Quiz[]
}

interface ToolContent {
  faqs: { id: string; question: string }[]
  scripts: { id: string; title: string }[]
  objections: { id: string; objection_text: string }[]
}

export function AssignmentEditor({ assignmentId, initialData, tools, quizzes }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [instructions, setInstructions] = useState(initialData?.instructions || '')
  const [toolId, setToolId] = useState(initialData?.tool_id || '')
  const [quizId, setQuizId] = useState(initialData?.quiz_id || '')
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [selectedItems, setSelectedItems] = useState<ContentItem[]>([])
  const [toolContent, setToolContent] = useState<ToolContent | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ faq: true, script: true, objection: true })

  const toolQuizzes = quizzes.filter(q => !toolId || q.tool_id === toolId)

  // When tool changes: reset quiz, content selections, and fetch tool content
  const handleToolChange = useCallback(async (newToolId: string) => {
    setToolId(newToolId)
    setQuizId('')
    setSelectedItems([])
    setToolContent(null)
    if (!newToolId) return

    setLoadingContent(true)
    const supabase = createClient()
    const [faqsRes, scriptsRes, objectionsRes] = await Promise.all([
      supabase.from('faqs').select('id, question').is('deleted_at', null).eq('tool_id', newToolId).eq('status', 'published').order('created_at'),
      supabase.from('scripts').select('id, title').is('deleted_at', null).eq('tool_id', newToolId).eq('status', 'published').order('title'),
      supabase.from('objections').select('id, objection_text').is('deleted_at', null).eq('tool_id', newToolId).eq('status', 'published').order('created_at'),
    ])
    setToolContent({
      faqs: faqsRes.data || [],
      scripts: scriptsRes.data || [],
      objections: objectionsRes.data || [],
    })
    setLoadingContent(false)
  }, [])

  // Toggle a content item in/out of selectedItems
  const toggleItem = (type: 'faq' | 'script' | 'objection', id: string, title: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.content_type === type && i.content_id === id)
      if (exists) return prev.filter(i => !(i.content_type === type && i.content_id === id))
      return [...prev, { content_type: type, content_id: id, content_title: title }]
    })
  }

  const isSelected = (type: string, id: string) =>
    selectedItems.some(i => i.content_type === type && i.content_id === id)

  // Select / deselect all items of a type
  const toggleAll = (type: 'faq' | 'script' | 'objection', items: { id: string; label: string }[]) => {
    const allSelected = items.every(i => isSelected(type, i.id))
    if (allSelected) {
      setSelectedItems(prev => prev.filter(i => i.content_type !== type))
    } else {
      const toAdd = items
        .filter(i => !isSelected(type, i.id))
        .map(i => ({ content_type: type, content_id: i.id, content_title: i.label }))
      setSelectedItems(prev => [...prev, ...toAdd])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const payload = {
      title,
      instructions,
      tool_id: toolId || null,
      quiz_id: quizId || null,
      due_date: dueDate || undefined,
    }

    let result
    let savedId: string | undefined

    if (assignmentId) {
      result = await updateAssignment(assignmentId, payload)
      savedId = assignmentId
    } else {
      result = await createAssignment(payload)
      savedId = (result as any).data?.id
    }

    if (result.error || !savedId) {
      setError(result.error || 'Failed to create assignment')
      setIsSubmitting(false)
      return
    }

    // Save content items
    if (selectedItems.length > 0 || assignmentId) {
      await saveAssignmentContentItems(savedId, selectedItems)
    }

    router.push('/admin/assignments')
    router.refresh()
  }

  const totalContent = toolContent
    ? toolContent.faqs.length + toolContent.scripts.length + toolContent.objections.length
    : 0

  const ContentSection = ({
    type,
    label,
    emoji,
    items,
  }: {
    type: 'faq' | 'script' | 'objection'
    label: string
    emoji: string
    items: { id: string; label: string }[]
  }) => {
    if (items.length === 0) return null
    const allSelected = items.every(i => isSelected(type, i.id))
    const someSelected = items.some(i => isSelected(type, i.id))
    const isOpen = openSections[type]

    return (
      <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSections(prev => ({ ...prev, [type]: !prev[type] }))}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>{emoji}</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
            <span className="text-xs text-gray-400">
              ({selectedItems.filter(i => i.content_type === type).length}/{items.length} selected)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleAll(type, items) }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        {isOpen && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
            {items.map(item => (
              <label key={item.id} className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected(type, item.id)
                    ? 'bg-brand-600 border-brand-600'
                    : 'border-gray-300 dark:border-gray-500'
                }`}>
                  {isSelected(type, item.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected(type, item.id)}
                  onChange={() => toggleItem(type, item.id, item.label)}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{item.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {assignmentId ? 'Edit' : 'New'} Assignment
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memorize Leonardo scripts"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions *</label>
            <textarea
              required
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe what the salesman needs to study and submit as proof..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>

          {/* Tool + Quiz row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tool (Optional)</label>
              <select
                value={toolId}
                onChange={(e) => handleToolChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">No specific tool</option>
                {tools.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attach Quiz (Optional)</label>
              <select
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                disabled={toolQuizzes.length === 0}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">No quiz</option>
                {toolQuizzes.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              {toolId && toolQuizzes.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No quizzes exist for this tool yet</p>
              )}
            </div>
          </div>

          {/* Content picker — loads after tool selected */}
          {toolId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content to Cover
                </label>
                <span className="text-xs text-gray-400">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {loadingContent ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading content for this tool...
                </div>
              ) : toolContent ? (
                totalContent === 0 ? (
                  <div className="text-sm text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
                    No published content found for this tool. Add FAQs, Scripts, or Objections first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ContentSection
                      type="faq"
                      label="FAQs"
                      emoji="❓"
                      items={toolContent.faqs.map(f => ({ id: f.id, label: f.question }))}
                    />
                    <ContentSection
                      type="script"
                      label="Scripts"
                      emoji="💬"
                      items={toolContent.scripts.map(s => ({ id: s.id, label: s.title }))}
                    />
                    <ContentSection
                      type="objection"
                      label="Objections"
                      emoji="🛡️"
                      items={toolContent.objections.map(o => ({ id: o.id, label: o.objection_text }))}
                    />
                    <p className="text-xs text-gray-400 pt-1">
                      Selected items appear as a study checklist on the salesman's assignment page.
                      Leave all unchecked to cover the whole tool generally.
                    </p>
                  </div>
                )
              ) : null}
            </div>
          )}

          {/* Due date */}
          <DateTimePicker label="Due Date (Optional)" value={dueDate} onChange={setDueDate} />

          {/* Submission types info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Salesmen can submit:</p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
              <li>Written text response / summary</li>
              <li>Image URL (photo of notes, screenshot)</li>
              <li>Media link (Google Drive, YouTube unlisted, WhatsApp)</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
