'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateTrainingPackage, saveBulkPackage } from '@/lib/actions/ai-bulk-generate'
import type { BulkGenerateResult } from '@/lib/actions/ai-bulk-generate'
import { Sparkles, Save, CheckSquare, Square, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

export function BulkGeneratePanel({ toolId, toolName, toolDescription }: { toolId: string; toolName: string; toolDescription: string }) {
  const router = useRouter()
  const [description, setDescription] = useState(toolDescription)
  const [result, setResult] = useState<BulkGenerateResult | null>(null)
  const [publishAll, setPublishAll] = useState(false)
  const [publishConfirmed, setPublishConfirmed] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState({ faqs: true, objections: true, scripts: true })

  async function handleGenerate() {
    if (!description.trim()) { setError('Please provide a tool description.'); return }
    setError(null)
    setResult(null)
    setSavedCount(null)
    setIsGenerating(true)
    try {
      const res = await generateTrainingPackage(toolId, toolName, description)
      if (res.error) { setError(res.error); return }
      setResult(res.data!)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!result) return
    if (publishAll && !publishConfirmed) { setError('Please check the confirmation box to publish immediately.'); return }
    setError(null)
    setIsSaving(true)
    try {
      const res = await saveBulkPackage(toolId, result, publishAll)
      if (res.error) { setError(res.error); return }
      setSavedCount((res.data as any).saved)
      setTimeout(() => router.push('/admin/tools'), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  function toggleSection(s: keyof typeof expandedSections) {
    setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }))
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Description */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Step 1: Describe the Tool</h2>
        <textarea
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
          placeholder={`Describe ${toolName} — what it does, target audience, key benefits, pricing...`}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? 'Generating... (this may take 30-60s)' : 'Generate Training Package'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {savedCount !== null && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-sm">
          ✓ Saved {savedCount} items successfully! Redirecting to tools...
        </div>
      )}

      {/* Step 2: Review results */}
      {result && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Step 2: Review Generated Content</h2>

          {/* FAQs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button onClick={() => toggleSection('faqs')} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <span className="font-semibold text-gray-900 dark:text-white">📖 FAQs ({result.faqs?.length ?? 0})</span>
              {expandedSections.faqs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.faqs && (
              <div className="px-5 pb-5 space-y-3">
                {result.faqs?.map((f, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{f.question}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{f.short_answer}</p>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded mt-2 inline-block">{f.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Objections */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button onClick={() => toggleSection('objections')} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <span className="font-semibold text-gray-900 dark:text-white">🛡️ Objections ({result.objections?.length ?? 0})</span>
              {expandedSections.objections ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.objections && (
              <div className="px-5 pb-5 space-y-3">
                {result.objections?.map((o, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <p className="font-medium text-gray-900 dark:text-white text-sm italic">"{o.objection_text}"</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">{o.response_text}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{o.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${o.severity === 'high' ? 'bg-red-100 text-red-600' : o.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{o.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scripts */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button onClick={() => toggleSection('scripts')} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <span className="font-semibold text-gray-900 dark:text-white">📝 Scripts ({result.scripts?.length ?? 0})</span>
              {expandedSections.scripts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.scripts && (
              <div className="px-5 pb-5 space-y-3">
                {result.scripts?.map((s, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{s.script_type} • {s.when_to_use}</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 whitespace-pre-wrap">{s.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Save options */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Step 3: Save</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <button type="button" onClick={() => setPublishAll(false)} className="flex-shrink-0">
                  {!publishAll ? <CheckSquare className="w-5 h-5 text-brand-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                </button>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Save as Draft (Recommended)</p>
                  <p className="text-gray-400 text-xs">All items saved as draft — review and publish each one manually.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <button type="button" onClick={() => setPublishAll(true)} className="flex-shrink-0">
                  {publishAll ? <CheckSquare className="w-5 h-5 text-amber-500" /> : <Square className="w-5 h-5 text-gray-400" />}
                </button>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Publish Immediately</p>
                  <p className="text-gray-400 text-xs">All items published right away. Salesmen can see them immediately.</p>
                </div>
              </label>
              {publishAll && (
                <label className="flex items-start gap-3 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl cursor-pointer" onClick={() => setPublishConfirmed(p => !p)}>
                  <span className="flex-shrink-0 mt-0.5">
                    {publishConfirmed ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-amber-500" />}
                  </span>
                  <p className="text-amber-700 dark:text-amber-400 text-xs">I confirm I've reviewed the content and it's ready for salesmen. AI-generated content may need spot-checking.</p>
                </label>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || (publishAll && !publishConfirmed)}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : `Save ${result.faqs?.length + result.objections?.length + result.scripts?.length} Items`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
