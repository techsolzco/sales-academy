'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveCourseContentItems } from '@/lib/actions/courses'
import type { CourseContentItem } from '@/lib/actions/courses'
import { ChevronDown, ChevronUp, Check, Loader2, Save } from 'lucide-react'

interface Props {
  courseId: string
  toolId: string | null
  initialItems: CourseContentItem[]
}

interface ToolContent {
  faqs: { id: string; question: string }[]
  scripts: { id: string; title: string }[]
  objections: { id: string; objection_text: string }[]
  quizzes: { id: string; title: string }[]
}

export function CourseContentPicker({ courseId, toolId, initialItems }: Props) {
  const [selectedItems, setSelectedItems] = useState<CourseContentItem[]>(initialItems)
  const [toolContent, setToolContent] = useState<ToolContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    faq: true, script: true, objection: true, quiz: true,
  })

  const loadContent = useCallback(async () => {
    if (!toolId) return
    setLoading(true)
    const supabase = createClient()
    const [faqsRes, scriptsRes, objectionsRes, quizzesRes] = await Promise.all([
      supabase.from('faqs').select('id, question').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').order('created_at'),
      supabase.from('scripts').select('id, title').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').order('title'),
      supabase.from('objections').select('id, objection_text').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').order('created_at'),
      supabase.from('quizzes').select('id, title').is('deleted_at', null).eq('tool_id', toolId).order('created_at'),
    ])
    setToolContent({
      faqs: faqsRes.data || [],
      scripts: scriptsRes.data || [],
      objections: objectionsRes.data || [],
      quizzes: quizzesRes.data || [],
    })
    setLoading(false)
  }, [toolId])

  useEffect(() => { loadContent() }, [loadContent])

  const isSelected = (type: string, id: string) =>
    selectedItems.some(i => i.content_type === type && i.content_id === id)

  const toggleItem = (type: CourseContentItem['content_type'], id: string, title: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.content_type === type && i.content_id === id)
      if (exists) return prev.filter(i => !(i.content_type === type && i.content_id === id))
      return [...prev, { content_type: type, content_id: id, content_title: title }]
    })
  }

  const toggleAll = (type: CourseContentItem['content_type'], items: { id: string; label: string }[]) => {
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

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const res = await saveCourseContentItems(courseId, selectedItems)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const Section = ({
    type,
    label,
    emoji,
    items,
  }: {
    type: CourseContentItem['content_type']
    label: string
    emoji: string
    items: { id: string; label: string }[]
  }) => {
    if (items.length === 0) return null
    const allSelected = items.every(i => isSelected(type, i.id))
    const selectedCount = selectedItems.filter(i => i.content_type === type).length
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
            <span className="text-xs text-gray-400">({selectedCount}/{items.length} selected)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggleAll(type, items) }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        {isOpen && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-52 overflow-y-auto">
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

  if (!toolId) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 p-10 text-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">No tool linked to this course</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Edit the course settings and link a tool to enable the content picker.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading content library...
      </div>
    )
  }

  const totalAvailable = toolContent
    ? toolContent.faqs.length + toolContent.scripts.length + toolContent.objections.length + toolContent.quizzes.length
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pick specific FAQs, Scripts, Objections, and Quizzes to include in this course.
          Students will see these as their study checklist.
        </p>
        <span className="text-xs text-gray-400 shrink-0 ml-4">
          {selectedItems.length} of {totalAvailable} selected
        </span>
      </div>

      {totalAvailable === 0 ? (
        <div className="text-sm text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl p-6 text-center">
          No published content found for this tool. Add FAQs, Scripts, or Objections from the other tabs first.
        </div>
      ) : (
        <div className="space-y-2">
          {toolContent && (
            <>
              <Section type="faq" label="FAQs" emoji="&#x2753;" items={toolContent.faqs.map(f => ({ id: f.id, label: f.question }))} />
              <Section type="script" label="Scripts" emoji="&#x1F4AC;" items={toolContent.scripts.map(s => ({ id: s.id, label: s.title }))} />
              <Section type="objection" label="Objections" emoji="&#x1F6E1;&#xFE0F;" items={toolContent.objections.map(o => ({ id: o.id, label: o.objection_text }))} />
              <Section type="quiz" label="Quizzes" emoji="&#x1F4DD;" items={toolContent.quizzes.map(q => ({ id: q.id, label: q.title }))} />
            </>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">Content saved</span>
        )}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Content Selection'}
          </button>
        </div>
      </div>
    </div>
  )
}
