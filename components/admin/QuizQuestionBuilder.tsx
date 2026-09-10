'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, Save, Loader2, Sparkles, ChevronDown, ChevronUp, X } from 'lucide-react'
import { syncQuizQuestions, generateQuestionsForQuiz, generateQuestionsFromContent } from '@/lib/actions/quizzes'
import { createClient } from '@/lib/supabase/client'
import type { GeneratedQuestion } from '@/lib/actions/quizzes'

interface Props {
  quizId: string
  initialQuestions?: any[]
  toolId?: string | null
  toolName?: string | null
}

interface ToolItem {
  id: string
  label: string
  type: 'faq' | 'script' | 'objection'
}

export function QuizQuestionBuilder({ quizId, initialQuestions = [], toolId, toolName }: Props) {
  const [questions, setQuestions] = useState<any[]>(
    initialQuestions.map(q => ({
      ...q,
      options: q.options ? [...q.options].sort((a: any, b: any) => a.order_index - b.order_index) : []
    })).sort((a: any, b: any) => a.order_index - b.order_index)
  )

  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [genCount, setGenCount] = useState(8)
  const [showGenOptions, setShowGenOptions] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})

  // Content picker for targeted AI generation
  const [showContentPicker, setShowContentPicker] = useState(false)
  const [toolItems, setToolItems] = useState<ToolItem[]>([])
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set())
  const [loadingToolContent, setLoadingToolContent] = useState(false)

  const loadToolContent = useCallback(async () => {
    if (!toolId) return
    setLoadingToolContent(true)
    const supabase = createClient()
    const [faqsRes, scriptsRes, objectionsRes] = await Promise.all([
      supabase.from('faqs').select('id, question').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').order('created_at'),
      supabase.from('scripts').select('id, title').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').order('title'),
      supabase.from('objections').select('id, objection_text').is('deleted_at', null).eq('tool_id', toolId).eq('status', 'published').order('created_at'),
    ])
    const items: ToolItem[] = [
      ...(faqsRes.data || []).map((f: any) => ({ id: f.id, label: f.question, type: 'faq' as const })),
      ...(scriptsRes.data || []).map((s: any) => ({ id: s.id, label: s.title, type: 'script' as const })),
      ...(objectionsRes.data || []).map((o: any) => ({ id: o.id, label: o.objection_text, type: 'objection' as const })),
    ]
    setToolItems(items)
    setLoadingToolContent(false)
  }, [toolId])

  useEffect(() => { if (showContentPicker) loadToolContent() }, [showContentPicker, loadToolContent])

  const toggleContentItem = (id: string) => {
    setSelectedContentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const addQuestion = () => {
    const now = Date.now()
    setQuestions(prev => [
      ...prev,
      {
        id: 'new-' + now,
        question_text: '',
        points: 1,
        explanation: '',
        options: [
          { id: 'new-opt-' + now + '-0', option_text: '', is_correct: true },
          { id: 'new-opt-' + now + '-1', option_text: '', is_correct: false },
          { id: 'new-opt-' + now + '-2', option_text: '', is_correct: false },
          { id: 'new-opt-' + now + '-3', option_text: '', is_correct: false },
        ]
      }
    ])
  }

  const updateQuestion = (qIdx: number, field: string, val: any) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, [field]: val } : q))
  }

  const removeQuestion = (qIdx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== qIdx))
  }

  const addOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      return {
        ...q,
        options: [...q.options, {
          id: 'new-opt-' + Date.now(),
          option_text: '',
          is_correct: false,
        }]
      }
    }))
  }

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, options: q.options.map((o: any, j: number) => j === oIdx ? { ...o, option_text: text } : o) }
    }))
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const newOpts = q.options.filter((_: any, j: number) => j !== oIdx)
      // If removed was correct, make first correct
      const hasCorrect = newOpts.some((o: any) => o.is_correct)
      if (!hasCorrect && newOpts.length > 0) newOpts[0].is_correct = true
      return { ...q, options: newOpts }
    }))
  }

  const setCorrect = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, options: q.options.map((o: any, j: number) => ({ ...o, is_correct: j === oIdx })) }
    }))
  }

  const handleSave = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) { setError(`Question ${i + 1}: text is empty.`); return }
      if (q.options.length < 2) { setError(`Question ${i + 1}: needs at least 2 options.`); return }
      if (!q.options.some((o: any) => o.is_correct)) { setError(`Question ${i + 1}: mark one option as correct.`); return }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].option_text.trim()) { setError(`Question ${i + 1}, option ${j + 1}: text is empty.`); return }
      }
    }
    setError(null)
    setIsSaving(true)
    const res = await syncQuizQuestions(quizId, questions)
    setIsSaving(false)
    if (res.error) { setError(res.error); return }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleGenerate = () => {
    // Open content picker if tool is linked; otherwise fall back to full-tool generation
    if (toolId) {
      setShowContentPicker(true)
    } else {
      handleGenerateFull()
    }
  }

  const handleGenerateFull = async () => {
    setIsGenerating(true)
    setError(null)
    setShowGenOptions(false)
    const res = await generateQuestionsForQuiz(quizId, genCount)
    setIsGenerating(false)
    if (res.error || !res.data) { setError(res.error || 'Generation failed'); return }
    setQuestions(res.data as any[])
    setSuccess(false)
  }

  const handleGenerateFromSelected = async () => {
    setShowContentPicker(false)
    if (selectedContentIds.size === 0) {
      // No items selected — fall back to full tool context
      await handleGenerateFull()
      return
    }
    setIsGenerating(true)
    setError(null)
    const selectedItems = toolItems
      .filter(item => selectedContentIds.has(item.id))
      .map(item => ({ type: item.type, id: item.id }))
    const res = await generateQuestionsFromContent(quizId, selectedItems, genCount)
    setIsGenerating(false)
    if (res.error || !res.data) { setError(res.error || 'Generation failed'); return }
    setQuestions(res.data as any[])
    setSuccess(false)
    setSelectedContentIds(new Set())
  }

  const totalPoints = questions.reduce((s, q) => s + (q.points || 1), 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Questions</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalPoints} total points
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Generate with AI */}
          <div className="relative">
            <div className="flex rounded-xl overflow-hidden border border-purple-200 dark:border-purple-700">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-semibold transition-colors disabled:opacity-50"
                title={toolId ? `Generate ${genCount} MCQs from ${toolName || 'tool'} content` : 'Link a tool in settings to use AI generation'}
              >
                {isGenerating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
              <button
                onClick={() => setShowGenOptions(v => !v)}
                disabled={isGenerating}
                className="px-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-500 dark:text-purple-400 border-l border-purple-200 dark:border-purple-700 transition-colors disabled:opacity-50"
              >
                {showGenOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            {showGenOptions && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-3 min-w-[200px]">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Questions to generate</p>
                {[5, 8, 10, 15].map(n => (
                  <button
                    key={n}
                    onClick={() => { setGenCount(n); setShowGenOptions(false) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${genCount === n ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-900/30 dark:text-purple-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    {n} questions
                  </button>
                ))}
                {!toolId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 px-1">
                    ⚠️ Link a tool in quiz settings first for best results.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Add manually */}
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 rounded-xl font-semibold text-sm transition-colors border border-brand-200 dark:border-brand-700"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>
      </div>

      {/* Content picker panel for AI generation */}
      {showContentPicker && (
        <div className="mx-6 mt-4 border border-purple-200 dark:border-purple-700 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-200 dark:border-purple-700">
            <div>
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Select Content to Generate From</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                Pick specific items from <span className="font-medium">{toolName}</span> — AI will generate {genCount} questions grounded ONLY in your selection.
                Leave all unselected to use full tool context.
              </p>
            </div>
            <button
              onClick={() => { setShowContentPicker(false); setSelectedContentIds(new Set()) }}
              className="p-1.5 text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingToolContent ? (
            <div className="flex items-center gap-2 text-sm text-purple-500 p-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading content...
            </div>
          ) : toolItems.length === 0 ? (
            <p className="text-sm text-purple-500 dark:text-purple-400 p-4">
              No published FAQs, Scripts, or Objections found for this tool. Generate from full context instead.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-purple-100 dark:divide-purple-800">
              {toolItems.map(item => (
                <label key={item.id} className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedContentIds.has(item.id)
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-purple-300 dark:border-purple-600'
                  }`}>
                    {selectedContentIds.has(item.id) && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedContentIds.has(item.id)}
                    onChange={() => toggleContentItem(item.id)}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-purple-500 dark:text-purple-400 uppercase mr-1.5">
                      {item.type}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{item.label}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
            <span className="text-xs text-purple-500 dark:text-purple-400">
              {selectedContentIds.size > 0 ? `${selectedContentIds.size} item${selectedContentIds.size !== 1 ? 's' : ''} selected` : 'No selection — will use full tool context'}
            </span>
            <button
              onClick={handleGenerateFromSelected}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generate {genCount} Questions
            </button>
          </div>
        </div>
      )}

      {/* Status messages */}
      <div className="px-6">
        {error && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
        {success && <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm">✓ Questions saved successfully!</div>}
      </div>

      {/* Questions list */}
      <div className="p-6 space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-12 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium mb-1">No questions yet</p>
            <p className="text-xs">Click "Generate with AI" to auto-create from tool content, or "Add Question" to write manually.</p>
          </div>
        ) : (
          questions.map((q, qIdx) => {
            const isCollapsed = collapsed[qIdx]
            return (
              <div key={q.id} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                {/* Question header */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50">
                  <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={q.question_text}
                      onChange={e => updateQuestion(qIdx, 'question_text', e.target.value)}
                      placeholder="Enter question text..."
                      rows={2}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                    />
                    <div className="flex items-center gap-3 mt-1.5">
                      <label className="flex items-center gap-1 text-xs text-gray-500">
                        Points:
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={q.points || 1}
                          onChange={e => updateQuestion(qIdx, 'points', parseInt(e.target.value) || 1)}
                          className="w-12 ml-1 px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded text-xs text-center"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setCollapsed(prev => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                      title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Options */}
                {!isCollapsed && (
                  <div className="p-4 space-y-2">
                    {q.options.map((o: any, oIdx: number) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrect(qIdx, oIdx)}
                          className={`flex-shrink-0 transition ${o.is_correct ? 'text-green-600 dark:text-green-400' : 'text-gray-300 hover:text-gray-400'}`}
                          title={o.is_correct ? 'Correct answer' : 'Mark as correct'}
                        >
                          {o.is_correct ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <input
                          type="text"
                          value={o.option_text}
                          onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none ${
                            o.is_correct
                              ? 'border-green-300 dark:border-green-600 bg-green-50/30 dark:bg-green-900/10'
                              : 'border-gray-200 dark:border-gray-600'
                          }`}
                        />
                        <button
                          onClick={() => removeOption(qIdx, oIdx)}
                          disabled={q.options.length <= 2}
                          className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {q.options.length < 6 && (
                      <button
                        onClick={() => addOption(qIdx)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mt-1 ml-7"
                      >
                        <Plus className="w-3 h-3" /> Add option
                      </button>
                    )}

                    {/* Explanation (shown if AI-generated or manually filled) */}
                    {(q.explanation !== undefined) && (
                      <div className="mt-3 ml-7">
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)}
                          placeholder="Explanation (optional — shown after quiz is submitted)"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg text-xs text-gray-600 dark:text-gray-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Save footer */}
      {questions.length > 0 && (
        <div className="px-6 pb-6 flex justify-end border-t border-gray-100 dark:border-gray-700 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save {questions.length} Question{questions.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
