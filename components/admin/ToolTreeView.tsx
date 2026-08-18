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
  Globe
} from 'lucide-react'
import { ToolTreeData } from '@/types'
import { publishToolTree, refreshToolKnowledge } from '@/lib/actions/tool-onboard'

interface ToolTreeViewProps {
  data: ToolTreeData
}

export function ToolTreeView({ data }: ToolTreeViewProps) {
  const { tool, course, faqs, objections, scripts } = data

  const [courseExpanded, setCourseExpanded] = useState(true)
  const [faqsExpanded, setFaqsExpanded] = useState(true)
  const [objectionsExpanded, setObjectionsExpanded] = useState(true)
  const [scriptsExpanded, setScriptsExpanded] = useState(true)

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState<string | null>(null)

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
    setIsRefreshing(true)
    const result = await refreshToolKnowledge(data.tool.id)
    setIsRefreshing(false)
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setSuccessMsg('AI knowledge summary updated!')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {confirmPublish && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">Confirm Publish</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {confirmPublish === 'all'
                ? 'This will publish the tool, course, FAQs, objections, and scripts. Are you sure?'
                : `This will publish all ${confirmPublish} for this tool. Continue?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmPublish(null)} className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition">Cancel</button>
              <button onClick={() => handlePublish(confirmPublish as any)} disabled={isPending} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Publish
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Tool Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="w-6 h-6 text-brand-600" />
              {tool.name}
            </h2>
            <div className="flex gap-2 mt-2">
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

      {/* Publish toolbar */}
      <div className="flex flex-wrap gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mr-2">
          <Globe className="w-4 h-4" /> Publish:
        </span>
        <button onClick={() => setConfirmPublish('all')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1">
          {isPending && confirmPublish === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Publish All
        </button>
        <button onClick={() => setConfirmPublish('course')} className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium transition">Course Only</button>
        <button onClick={() => setConfirmPublish('faqs')} className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition">FAQs Only</button>
        <button onClick={() => setConfirmPublish('objections')} className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium transition">Objections Only</button>
        <button onClick={() => setConfirmPublish('scripts')} className="px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium transition">Scripts Only</button>
        <button onClick={handleRefreshKnowledge} disabled={isRefreshing} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium transition flex items-center gap-1 disabled:opacity-50">
          {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Update AI Knowledge
        </button>
      </div>

      {/* Knowledge Summary */}
      {tool.knowledge_summary && (
        <div className="bg-brand-50 dark:bg-brand-900/10 p-6 rounded-2xl border border-brand-100 dark:border-brand-900/30">
          <h3 className="text-lg font-semibold text-brand-900 dark:text-brand-300 flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            AI Knowledge Summary
          </h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
            {tool.knowledge_summary}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Course Tree */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button 
            onClick={() => setCourseExpanded(!courseExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Course Content</h3>
            </div>
            {courseExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
          </button>
          
          {courseExpanded && (
            <div className="p-4">
              {!course ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No course content available.</p>
              ) : (
                <div className="font-mono text-sm">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium mb-2">
                    <BookOpen className="w-4 h-4" />
                    {course.title}
                  </div>
                  <div className="ml-2 border-l border-gray-300 dark:border-gray-600 pl-4 py-1 space-y-3">
                    {course.modules.length === 0 && (
                       <p className="text-sm text-gray-500 dark:text-gray-400 italic">No modules in this course.</p>
                    )}
                    {course.modules.map((mod, mIdx) => (
                      <div key={mod.id}>
                        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                          <span className="text-gray-400">├──</span>
                          <FolderOpen className="w-4 h-4 text-blue-500" />
                          <span className="font-sans">{mod.title}</span>
                        </div>
                        <div className="ml-6 border-l border-gray-300 dark:border-gray-600 pl-4 py-1 space-y-2 mt-1">
                          {mod.lessons.length === 0 && (
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                              <span className="text-gray-400">└──</span>
                              <span className="font-sans italic text-xs">Empty module</span>
                            </div>
                          )}
                          {mod.lessons.map((lesson, lIdx) => {
                            const isLast = lIdx === mod.lessons.length - 1;
                            return (
                              <div key={lesson.id} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <span className="text-gray-400">{isLast ? '└──' : '├──'}</span>
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="font-sans">{lesson.title}</span>
                                <span className="text-xs text-gray-400 font-sans">({lesson.content_blocks?.length || 0} blocks)</span>
                              </div>
                            )
                          })}
                        </div>
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
          <button 
            onClick={() => setFaqsExpanded(!faqsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">FAQs ({faqs.length})</h3>
            </div>
            {faqsExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
          </button>
          
          {faqsExpanded && (
            <div className="p-4 space-y-3">
              {faqs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No FAQs available.</p>
              ) : (
                faqs.map(faq => (
                  <div key={faq.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{faq.question}</p>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full shrink-0 capitalize">
                        {faq.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{faq.short_answer}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Objections */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button 
            onClick={() => setObjectionsExpanded(!objectionsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Objections ({objections.length})</h3>
            </div>
            {objectionsExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
          </button>
          
          {objectionsExpanded && (
            <div className="p-4 space-y-3">
              {objections.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No objections available.</p>
              ) : (
                objections.map(obj => (
                  <div key={obj.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{obj.objection_text}</p>
                      {obj.difficulty && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full shrink-0 uppercase">
                          {obj.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{obj.recommended_response}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Scripts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button 
            onClick={() => setScriptsExpanded(!scriptsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Scripts ({scripts.length})</h3>
            </div>
            {scriptsExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
          </button>
          
          {scriptsExpanded && (
            <div className="p-4 space-y-3">
              {scripts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No scripts available.</p>
              ) : (
                scripts.map(script => (
                  <div key={script.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{script.title}</p>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full shrink-0 capitalize">
                        {script.script_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{script.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
