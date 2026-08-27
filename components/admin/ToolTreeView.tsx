'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  FolderOpen,
  FileText,
  HelpCircle,
  Shield,
  MessageSquare,
  Brain,
  Package,
  Check,
  Loader2,
  RefreshCw,
  Globe,
  Pencil,
  Save,
  X,
  Plus,
  Mic,
} from 'lucide-react'
import { ToolTreeData } from '@/types'
import { publishToolTree, refreshToolKnowledge, updateToolKnowledgeSummary } from '@/lib/actions/tool-onboard'
import { FAQFormModal } from '@/components/admin/FAQFormModal'
import { ObjectionFormModal } from '@/components/admin/ObjectionFormModal'
import { ScriptFormModal } from '@/components/admin/ScriptFormModal'


interface ToolTreeViewProps {
  data: ToolTreeData
  tools?: { id: string; name: string }[]
}

export function ToolTreeView({ data, tools = [] }: ToolTreeViewProps) {
  const { tool, course, faqs, objections, scripts } = data

  // Default collapsed on mobile (sections open on desktop via true)
  const [courseExpanded, setCourseExpanded] = useState(true)
  const [faqsExpanded, setFaqsExpanded] = useState(true)
  const [objectionsExpanded, setObjectionsExpanded] = useState(true)
  const [scriptsExpanded, setScriptsExpanded] = useState(true)

  // Inline create modal state — tool_id pre-locked to current tool
  const [addFaqOpen, setAddFaqOpen] = useState(false)
  const [addObjOpen, setAddObjOpen] = useState(false)
  const [addScriptOpen, setAddScriptOpen] = useState(false)
  const [addVoiceOpen, setAddVoiceOpen] = useState(false)

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState<string | null>(null)

  // Knowledge summary editing state
  const [isEditingKS, setIsEditingKS] = useState(false)
  const [ksText, setKsText] = useState(tool.knowledge_summary || '')
  const [isSavingKS, setIsSavingKS] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  const handlePublish = (section: 'all' | 'course' | 'faqs' | 'objections' | 'scripts') => {
    setConfirmPublish(null)
    startTransition(async () => {
      const result = await publishToolTree(data.tool.id, section)
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setSuccessMsg(`${section === 'all' ? 'Everything' : section} published successfully!`)
        router.refresh()
      }
    })
  }

  const handleRefreshKnowledge = async () => {
    setConfirmRegenerate(false)
    setIsRefreshing(true)
    const result = await refreshToolKnowledge(data.tool.id)
    setIsRefreshing(false)
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setSuccessMsg('AI knowledge summary regenerated from current content!')
      setKsText(result.data || '')
      setIsEditingKS(false)
      router.refresh()
    }
  }

  const handleSaveKnowledgeSummary = async () => {
    setIsSavingKS(true)
    const result = await updateToolKnowledgeSummary(data.tool.id, ksText)
    setIsSavingKS(false)
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setSuccessMsg('Knowledge summary saved (marked as manually edited).')
      setIsEditingKS(false)
      router.refresh()
    }
  }

  const handleRegenerateClick = () => {
    // If manually edited, show confirmation first
    if (tool.knowledge_summary_source === 'manual') {
      setConfirmRegenerate(true)
    } else {
      handleRefreshKnowledge()
    }
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Confirm publish modal — full-screen sheet on mobile */}
      {confirmPublish && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">Confirm Publish</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {confirmPublish === 'all'
                ? 'This will publish the tool, course, FAQs, objections, and scripts. Are you sure?'
                : `This will publish all ${confirmPublish} for this tool. Continue?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmPublish(null)} className="min-h-[44px] px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition">Cancel</button>
              <button onClick={() => handlePublish(confirmPublish as any)} disabled={isPending} className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tool Header */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 break-words">
              <Package className="w-5 h-5 md:w-6 md:h-6 text-brand-600 flex-shrink-0" />
              <span className="min-w-0 break-words">{tool.name}</span>
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                {tool.category}
              </span>
              <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full capitalize">
                {tool.status}
              </span>
              {tool.pricing && (
                <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                  {tool.pricing}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish toolbar — wraps on mobile */}
      <div className="flex flex-wrap gap-2 p-3 md:p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 w-full sm:w-auto">
          <Globe className="w-4 h-4" /> Publish:
        </span>
        <button onClick={() => setConfirmPublish('all')} className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1">
          {isPending && confirmPublish === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Publish All
        </button>
        <button onClick={() => setConfirmPublish('course')} className="min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium transition">Course Only</button>
        <button onClick={() => setConfirmPublish('faqs')} className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition">FAQs Only</button>
        <button onClick={() => setConfirmPublish('objections')} className="min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium transition">Objections</button>
        <button onClick={() => setConfirmPublish('scripts')} className="min-h-[36px] px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium transition">Scripts</button>
        <button onClick={handleRegenerateClick} disabled={isRefreshing} className="min-h-[36px] px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium transition flex items-center gap-1 disabled:opacity-50 sm:ml-auto">
          {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Regenerate AI Knowledge
        </button>
      </div>

      {/* Regenerate Confirmation Dialog */}
      {confirmRegenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">Overwrite Manual Edits?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This knowledge summary was manually edited. Regenerating will replace your custom text with an AI-generated summary based on current FAQs, scripts, and objections. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmRegenerate(false)} className="min-h-[44px] px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition">Cancel</button>
              <button onClick={handleRefreshKnowledge} disabled={isRefreshing} className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Summary — Editable */}
      <div className="bg-brand-50 dark:bg-brand-900/10 p-4 md:p-6 rounded-2xl border border-brand-100 dark:border-brand-900/30">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base md:text-lg font-semibold text-brand-900 dark:text-brand-300 flex items-center gap-2">
              <Brain className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
              AI Knowledge Summary
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This is exactly what Ask AI knows about this tool. {tool.knowledge_summary_source === 'manual' ? '✏️ Manually edited' : '🤖 Auto-generated from content'}{tool.knowledge_summary_updated_at ? ` · Updated ${new Date(tool.knowledge_summary_updated_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
          {!isEditingKS && (
            <button
              onClick={() => { setKsText(tool.knowledge_summary || ''); setIsEditingKS(true) }}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/40 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-medium transition flex items-center gap-1 shrink-0"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {isEditingKS ? (
          <div className="space-y-3">
            <textarea
              value={ksText}
              onChange={e => setKsText(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm leading-relaxed focus:ring-2 focus:ring-brand-500 outline-none transition resize-y"
              placeholder="Enter the knowledge summary that Ask AI will use for this tool..."
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setIsEditingKS(false)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                onClick={handleSaveKnowledgeSummary}
                disabled={isSavingKS || !ksText.trim()}
                className="min-h-[36px] px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50"
              >
                {isSavingKS ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Manual Edit
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed break-words">
            {tool.knowledge_summary || 'No knowledge summary yet. Click "Regenerate AI Knowledge" to generate one from this tool\'s content.'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Course Tree */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setCourseExpanded(!courseExpanded)}
            className="w-full min-h-[52px] flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">Course Content</h3>
            </div>
            {courseExpanded ? <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />}
          </button>

          {courseExpanded && (
            <div className="p-4">
              {!course ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No course content available.</p>
              ) : (
                <div className="space-y-3">
                  {/* Course title */}
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm break-words min-w-0">{course.title}</span>
                  </div>
                  {/* Modules — use card-based indented style instead of font-mono ASCII */}
                  <div className="ml-3 border-l-2 border-blue-100 dark:border-blue-900/40 pl-3 space-y-2">
                    {course.modules.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No modules in this course.</p>
                    )}
                    {course.modules.map((mod) => (
                      <div key={mod.id} className="space-y-1.5">
                        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 min-w-0">
                          <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-medium break-words min-w-0">{mod.title}</span>
                        </div>
                        {mod.lessons.length > 0 && (
                          <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-1">
                            {mod.lessons.map((lesson) => (
                              <div key={lesson.id} className="flex items-start gap-2 text-gray-600 dark:text-gray-400 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <span className="text-xs break-words">{lesson.title}</span>
                                  <span className="text-[10px] text-gray-400 ml-1.5">({lesson.content_blocks?.length || 0} blocks)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {mod.lessons.length === 0 && (
                          <p className="ml-4 text-xs text-gray-400 italic">Empty module</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FAQs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="w-full min-h-[52px] flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setFaqsExpanded(!faqsExpanded)}
              className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
            >
              <HelpCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">FAQs ({faqs.length})</h3>
              {faqsExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 ml-1" /> : <ChevronRight className="w-4 h-4 text-gray-500 ml-1" />}
            </button>
            <button
              onClick={() => setAddFaqOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 transition-colors ml-2 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </div>

          {faqsExpanded && (
            <div className="p-3 md:p-4 space-y-3">
              {faqs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No FAQs available.</p>
              ) : (
                faqs.map(faq => (
                  <div key={faq.id} className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm break-words min-w-0">{faq.question}</p>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full shrink-0 capitalize">
                        {faq.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 break-words">{faq.short_answer}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Objections */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="w-full min-h-[52px] flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setObjectionsExpanded(!objectionsExpanded)}
              className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
            >
              <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">Objections ({objections.length})</h3>
              {objectionsExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 ml-1" /> : <ChevronRight className="w-4 h-4 text-gray-500 ml-1" />}
            </button>
            <button
              onClick={() => setAddObjOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 transition-colors ml-2 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Objection
            </button>
          </div>

          {objectionsExpanded && (
            <div className="p-3 md:p-4 space-y-3">
              {objections.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No objections available.</p>
              ) : (
                objections.map(obj => (
                  <div key={obj.id} className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm break-words min-w-0">{obj.objection_text}</p>
                      {obj.difficulty && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full shrink-0 uppercase">
                          {obj.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 break-words">{obj.recommended_response}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Scripts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="w-full min-h-[52px] flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setScriptsExpanded(!scriptsExpanded)}
              className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
            >
              <MessageSquare className="w-5 h-5 text-purple-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">Scripts ({scripts.length})</h3>
              {scriptsExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 ml-1" /> : <ChevronRight className="w-4 h-4 text-gray-500 ml-1" />}
            </button>
            <button
              onClick={() => setAddScriptOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 transition-colors ml-2 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Script
            </button>
          </div>

          {scriptsExpanded && (
            <div className="p-3 md:p-4 space-y-3">
              {scripts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No scripts available.</p>
              ) : (
                scripts.map(script => (
                  <div key={script.id} className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm break-words min-w-0">{script.title}</p>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full shrink-0 capitalize">
                        {script.script_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{script.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>


        {/* ─── Unified Quick-Add Bar ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Add</p>
            <p className="text-xs text-gray-400 mt-0.5">Add a new FAQ, Script, or Objection to this tool from one place</p>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            <button
              onClick={() => setAddFaqOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 transition-colors"
            >
              ❓ Add FAQ
            </button>
            <button
              onClick={() => setAddScriptOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 dark:text-violet-300 transition-colors"
            >
              💬 Add Script
            </button>
            <button
              onClick={() => setAddObjOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 transition-colors"
            >
              🛡️ Add Objection
            </button>
          </div>
        </div>

      </div>

      {/* Inline create modals — tool_id pre-locked to this tool */}
      <FAQFormModal
        isOpen={addFaqOpen}
        onClose={() => { setAddFaqOpen(false); router.refresh() }}
        tools={tools}
        defaultValues={{ tool_id: tool.id }}
      />
      <ObjectionFormModal
        isOpen={addObjOpen}
        onClose={() => { setAddObjOpen(false); router.refresh() }}
        tools={tools}
        defaultValues={{ tool_id: tool.id }}
      />
      <ScriptFormModal
        isOpen={addScriptOpen}
        onClose={() => { setAddScriptOpen(false); router.refresh() }}
        tools={tools}
        defaultValues={{ tool_id: tool.id }}
      />
    </div>
  )
}
