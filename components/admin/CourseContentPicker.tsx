'use client'

import { useState } from 'react'
import { saveCourseContentItems } from '@/lib/actions/courses'
import type { CourseContentItem } from '@/lib/actions/courses'
import { ChevronDown, ChevronUp, Check, Loader2, Save } from 'lucide-react'

interface Props {
  courseId: string
  initialItems: CourseContentItem[]
  faqs: { id: string; question: string; status?: string }[]
  scripts: { id: string; title: string; status?: string }[]
  objections: { id: string; objection_text: string; status?: string }[]
  quizzes: { id: string; title: string }[]
}

export function CourseContentPicker({ courseId, initialItems, faqs, scripts, objections, quizzes }: Props) {
  const [selectedItems, setSelectedItems] = useState<CourseContentItem[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    faq: true, script: false, objection: false, quiz: false,
  })

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

  function Section({
    type, label, emoji, items,
  }: {
    type: CourseContentItem['content_type']
    label: string
    emoji: string
    items: { id: string; label: string; status?: string }[]
  }) {
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
            <span className="text-xs text-gray-400">({selectedCount}/{items.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); toggleAll(type, items) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); toggleAll(type, items) } }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 cursor-pointer"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        {isOpen && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
            {items.map(item => (
              <label key={item.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected(type, item.id)
                      ? 'bg-brand-600 border-brand-600'
                      : 'border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {isSelected(type, item.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected(type, item.id)}
                  onChange={() => toggleItem(type, item.id, item.label)}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug flex-1 min-w-0 truncate">
                  {item.label}
                </span>
                {item.status && item.status !== 'published' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                    {item.status}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  const totalAvailable = faqs.length + scripts.length + objections.length + quizzes.length

  if (totalAvailable === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl p-8 text-center space-y-1">
        <p className="font-semibold">No content found</p>
        <p className="text-xs">Create some FAQs, Scripts, or Objections first � then come back here to link them to this course.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Open each section and check the items students should study in this course.
        </p>
        <span className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-4">
          {selectedItems.length} / {totalAvailable} selected
        </span>
      </div>

      <div className="space-y-2">
        <Section type="faq" label="FAQs" emoji="?" items={faqs.map(f => ({ id: f.id, label: f.question, status: f.status }))} />
        <Section type="script" label="Scripts" emoji="??" items={scripts.map(s => ({ id: s.id, label: s.title, status: s.status }))} />
        <Section type="objection" label="Objections" emoji="???" items={objections.map(o => ({ id: o.id, label: o.objection_text, status: o.status }))} />
        <Section type="quiz" label="Quizzes" emoji="??" items={quizzes.map(q => ({ id: q.id, label: q.title }))} />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          Error: {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        {saved ? (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">? Saved successfully!</span>
        ) : <span />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50 transition text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Content Selection'}
        </button>
      </div>
    </div>
  )
}
