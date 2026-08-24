'use client'

import { useState, useTransition } from 'react'
import { Brain, RefreshCw, Pencil, Save, X, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { refreshToolKnowledge, updateToolKnowledgeSummary } from '@/lib/actions/tool-onboard'
import { useRouter } from 'next/navigation'

interface ToolMemory {
  id: string
  name: string
  description?: string | null
  pricing?: string | null
  status?: string | null
  knowledge_summary: string | null
  knowledge_summary_source?: string | null
  knowledge_summary_updated_at?: string | null
}

interface AiMemoryViewProps {
  tools: ToolMemory[]
}

function ToolMemoryCard({ tool }: { tool: ToolMemory }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [isEditingKS, setIsEditingKS] = useState(false)
  const [ksText, setKsText] = useState(tool.knowledge_summary || '')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingKS, setIsSavingKS] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const source = tool.knowledge_summary_source
  const updatedAt = tool.knowledge_summary_updated_at
  const hasKS = !!tool.knowledge_summary

  const sourceLabel = source === 'manual' ? '✏️ Manually edited' : hasKS ? '🤖 Auto-generated' : '⚠️ No summary yet'
  const sourceColor = source === 'manual' ? 'text-amber-600 dark:text-amber-400' : hasKS ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'

  async function handleRegenerate() {
    setConfirmRegenerate(false)
    setIsRefreshing(true)
    setErrorMsg(null)
    const result = await refreshToolKnowledge(tool.id)
    setIsRefreshing(false)
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setSuccessMsg('Knowledge regenerated!')
      setKsText(result.data || '')
      setIsEditingKS(false)
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  async function handleSave() {
    setIsSavingKS(true)
    setErrorMsg(null)
    const result = await updateToolKnowledgeSummary(tool.id, ksText)
    setIsSavingKS(false)
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setSuccessMsg('Saved as manual edit.')
      setIsEditingKS(false)
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  function handleRegenerateClick() {
    if (source === 'manual') setConfirmRegenerate(true)
    else handleRegenerate()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
      >
        <Brain className="w-5 h-5 text-brand-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{tool.name}</span>
            {tool.pricing && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {tool.pricing}
              </span>
            )}
          </div>
          <div className={`text-xs mt-0.5 ${sourceColor}`}>
            {sourceLabel}
            {updatedAt && (
              <span className="text-gray-400 dark:text-gray-500 ml-1">
                · {new Date(updatedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="text-gray-400 dark:text-gray-500 ml-1">
              · {tool.knowledge_summary ? `${tool.knowledge_summary.length.toLocaleString()} chars` : 'empty'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {successMsg && <CheckCircle className="w-4 h-4 text-emerald-500" />}
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-3">
          {successMsg && (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle className="w-3 h-3" /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /> {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRegenerateClick}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium transition disabled:opacity-50"
            >
              {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Regenerate from Content
            </button>
            {!isEditingKS && (
              <button
                onClick={() => { setKsText(tool.knowledge_summary || ''); setIsEditingKS(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-medium transition"
              >
                <Pencil className="w-3 h-3" /> Edit Manually
              </button>
            )}
            <a
              href={`/admin/tools/${tool.id}/tree`}
              className="ml-auto text-xs text-brand-600 dark:text-brand-400 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Open Tool Tree →
            </a>
          </div>

          {/* Summary content */}
          {isEditingKS ? (
            <div className="space-y-2">
              <textarea
                value={ksText}
                onChange={e => setKsText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm leading-relaxed focus:ring-2 focus:ring-brand-500 outline-none transition resize-y font-mono"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditingKS(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSavingKS || !ksText.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isSavingKS ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Manual Edit
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 max-h-64 overflow-y-auto">
              {tool.knowledge_summary ? (
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed break-words">
                  {tool.knowledge_summary}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  No knowledge summary yet. Click "Regenerate from Content" to build one from this tool's FAQs, scripts, and objections.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirm overwrite dialog */}
      {confirmRegenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Overwrite Manual Edits?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              This summary was manually edited. Regenerating will replace it with auto-generated content from current FAQs, scripts, and objections.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRegenerate(false)}
                className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AiMemoryView({ tools }: AiMemoryViewProps) {
  const withKS = tools.filter(t => t.knowledge_summary)
  const withoutKS = tools.filter(t => !t.knowledge_summary)

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{withKS.length}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Tools with AI Knowledge</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {tools.filter(t => t.knowledge_summary_source === 'manual').length}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Manually Edited</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{withoutKS.length}</div>
          <div className="text-xs text-red-500 dark:text-red-500 mt-0.5">Missing Knowledge</div>
        </div>
      </div>

      {/* Tools with knowledge */}
      {withKS.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tools with AI Knowledge</h2>
          {withKS.map(tool => <ToolMemoryCard key={tool.id} tool={tool} />)}
        </div>
      )}

      {/* Tools without knowledge */}
      {withoutKS.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Missing Knowledge</h2>
          {withoutKS.map(tool => <ToolMemoryCard key={tool.id} tool={tool} />)}
        </div>
      )}

      {tools.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tools found. Onboard tools to populate AI memory.</p>
        </div>
      )}
    </div>
  )
}
