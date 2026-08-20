'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Edit3,
  Check,
  TreeDeciduous,
  Save,
  Sparkles,
  Plus
} from 'lucide-react'

import type {
  OnboardWizardData,
  GeneratedToolPackage,
  ToolCategory,
  GeneratedFAQ,
  GeneratedObjection,
  GeneratedScript,
  GeneratedModule,
  GeneratedLesson,
  GeneratedContentBlock,
  GeneratedCourse
} from '@/types'
import { generateToolPackage, saveToolPackage } from '@/lib/actions/tool-onboard'

const CATEGORIES: ToolCategory[] = [
  'AI Tools',
  'Design Tools',
  'Video Tools',
  'Marketing Tools',
  'Research Tools',
  'Productivity',
  'Sales',
  'Automation'
]

const LOADING_MESSAGES = [
  'Analyzing tool details...',
  'Generating course content...',
  'Creating FAQs...',
  'Building objection responses...',
  'Writing sales scripts...',
  'Assembling training package...'
]

export function ToolOnboardWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1 State
  const [wizardData, setWizardData] = useState<OnboardWizardData>({
    name: '',
    category: 'AI Tools',
    pricing: '',
    features: [''],
    targetAudience: '',
    sellingPoints: '',
    warrantyNotes: '',
    brief: ''
  })

  // Step 2 State
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Step 3/4 State
  const [packageData, setPackageData] = useState<GeneratedToolPackage | null>(null)
  
  // Step 4 State
  const [publishNow, setPublishNow] = useState(false)
  const [publishConfirmed, setPublishConfirmed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successData, setSuccessData] = useState<{ toolId: string } | null>(null)

  // Handlers for Step 1
  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(wizardData.features || [])]
    newFeatures[index] = value
    setWizardData({ ...wizardData, features: newFeatures })
  }

  const addFeature = () => {
    setWizardData({ ...wizardData, features: [...(wizardData.features || []), ''] })
  }

  const removeFeature = (index: number) => {
    const newFeatures = [...(wizardData.features || [])]
    newFeatures.splice(index, 1)
    setWizardData({ ...wizardData, features: newFeatures })
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wizardData.name || !wizardData.brief) {
      setError('Name and Brief description are required.')
      return
    }
    setError(null)
    setStep(2)

    try {
      const res = await generateToolPackage({
        ...wizardData,
        features: wizardData.features?.filter(f => f.trim() !== '')
      })
      if (res.error) throw new Error(res.error)
      if (res.data) {
        setPackageData(res.data)
        setStep(3)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate package')
      setStep(1)
    }
  }

  // Loading animation effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 2) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [step])

  // Tree Handlers
  const toggleRemoval = (type: string, path: number[]) => {
    if (!packageData) return
    const newData = { ...packageData }
    let target: any
    
    if (type === 'faq') target = newData.faqs[path[0]]
    if (type === 'objection') target = newData.objections[path[0]]
    if (type === 'script') target = newData.scripts[path[0]]
    if (type === 'voice_note') target = newData.voice_notes[path[0]]
    if (type === 'module') target = newData.course.modules[path[0]]
    if (type === 'lesson') target = newData.course.modules[path[0]].lessons[path[1]]

    if (target) {
      target._removed = !target._removed
      setPackageData(newData)
    }
  }

  const updateItem = (type: string, path: number[], field: string, value: string) => {
    if (!packageData) return
    const newData = { ...packageData }
    let target: any
    
    if (type === 'faq') target = newData.faqs[path[0]]
    if (type === 'objection') target = newData.objections[path[0]]
    if (type === 'script') target = newData.scripts[path[0]]
    if (type === 'voice_note') target = newData.voice_notes[path[0]]
    if (type === 'module') target = newData.course.modules[path[0]]
    if (type === 'lesson') target = newData.course.modules[path[0]].lessons[path[1]]
    if (type === 'block') target = newData.course.modules[path[0]].lessons[path[1]].content_blocks[path[2]]
    if (type === 'knowledge_summary') newData.knowledge_summary = value

    if (target && type !== 'knowledge_summary') {
      if (type === 'block') {
        if (target.type === 'heading') target.content.text = value
        if (target.type === 'text') target.content.body = value
      } else {
        target[field] = value
      }
    }
    setPackageData(newData)
  }

  const handleSave = async () => {
    if (!packageData) return
    setIsSaving(true)
    setError(null)

    try {
      const res = await saveToolPackage(wizardData, packageData, publishNow)
      if (res.error) throw new Error(res.error)
      if (res.data) {
        setSuccessData(res.data)
        setStep(5) // Success step
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save package')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Steps Header */}
      {step < 5 && (
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                ${step > s ? 'bg-brand-600 text-white' : 
                  step === s ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/30' : 
                  'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-full sm:w-24 h-1 mx-2 ${step > s ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-800'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Step 1: Info Form */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-8 h-8 text-brand-600" />
            <h2 className="text-2xl font-bold dark:text-gray-100">Tool Information</h2>
          </div>
          
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tool Name *</label>
                <input required type="text" value={wizardData.name} onChange={e => setWizardData({...wizardData, name: e.target.value})} 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                <select value={wizardData.category} onChange={e => setWizardData({...wizardData, category: e.target.value as ToolCategory})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Pricing (Optional)</label>
                <input type="text" value={wizardData.pricing} onChange={e => setWizardData({...wizardData, pricing: e.target.value})} placeholder="e.g. $29/mo, Free tier available"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Key Features</label>
                <div className="space-y-2">
                  {wizardData.features?.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={f} onChange={e => handleFeatureChange(i, e.target.value)} placeholder="Feature description"
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition" />
                      <button type="button" onClick={() => removeFeature(i)} className="p-2 text-gray-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                    </div>
                  ))}
                  <button type="button" onClick={addFeature} className="text-sm text-brand-600 font-medium flex items-center gap-1 hover:text-brand-700">
                    <Plus className="w-4 h-4"/> Add Feature
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Brief Description *</label>
              <textarea required rows={4} value={wizardData.brief} onChange={e => setWizardData({...wizardData, brief: e.target.value})} 
                placeholder="Describe what the tool does and why it's useful..."
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Target Audience (Optional)</label>
                <textarea rows={2} value={wizardData.targetAudience} onChange={e => setWizardData({...wizardData, targetAudience: e.target.value})} 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Main Selling Points (Optional)</label>
                <textarea rows={2} value={wizardData.sellingPoints} onChange={e => setWizardData({...wizardData, sellingPoints: e.target.value})} 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Warranty/Policy Notes (Optional)</label>
              <textarea rows={2} value={wizardData.warrantyNotes} onChange={e => setWizardData({...wizardData, warrantyNotes: e.target.value})} 
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none transition" />
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-sm">
                <Sparkles className="w-5 h-5" />
                Generate Training Package
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Generating */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-16 animate-fade-in border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-16 h-16 text-brand-600 animate-spin mb-8" />
          <div className="h-8 relative w-full max-w-sm overflow-hidden text-center">
            {LOADING_MESSAGES.map((msg, i) => (
              <p key={i} className={`absolute w-full text-lg font-medium text-gray-600 dark:text-gray-300 transition-all duration-500
                ${i === loadingMessageIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {msg}
              </p>
            ))}
          </div>
          <p className="text-gray-400 mt-4 text-sm">This may take a minute...</p>
        </div>
      )}

      {/* Step 3: Review Tree */}
      {step === 3 && packageData && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TreeDeciduous className="w-8 h-8 text-brand-600" />
              <h2 className="text-2xl font-bold dark:text-gray-100">Review Package Content</h2>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Click elements to edit or mark for removal
            </div>
          </div>

          <div className="space-y-6 font-mono text-sm overflow-x-auto">
            {/* Knowledge Summary */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                Knowledge Summary (Internal)
              </div>
              <textarea 
                value={packageData.knowledge_summary}
                onChange={e => updateItem('knowledge_summary', [], '', e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 font-sans min-h-[100px]"
              />
            </div>

            {/* Tree View Component */}
            <TreeView packageData={packageData} toggleRemoval={toggleRemoval} updateItem={updateItem} />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-between">
            <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Back to Edit
            </button>
            <button onClick={() => setStep(4)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-medium transition shadow-sm">
              Continue to Save <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm & Save */}
      {step === 4 && packageData && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in border border-gray-100 dark:border-gray-800 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold dark:text-gray-100 mb-2">Ready to Save</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            You are about to save {packageData.faqs.filter(f => !f._removed).length} FAQs, {packageData.objections.filter(o => !o._removed).length} Objections, {packageData.scripts.filter(s => !s._removed).length} Scripts, {packageData.voice_notes?.filter(v => !v._removed).length || 0} Voice Notes, and a full course for <strong className="text-gray-900 dark:text-white">{wizardData.name}</strong>.
            <br/><span className="text-sm mt-2 block text-brand-600 dark:text-brand-400">✓ A quiz will be auto-generated from this content</span>
          </p>

          <div className="space-y-4 mb-8">
            <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <input type="radio" checked={!publishNow} onChange={() => setPublishNow(false)} className="mt-1 text-brand-600 focus:ring-brand-500" />
              <div>
                <div className="font-medium dark:text-gray-200">Save all as Draft (recommended)</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review the content in the dashboard before publishing to the sales team.</div>
              </div>
            </label>

            <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <input type="radio" checked={publishNow} onChange={() => setPublishNow(true)} className="mt-1 text-brand-600 focus:ring-brand-500" />
              <div>
                <div className="font-medium dark:text-gray-200">Publish everything now</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Make all generated content instantly available to the sales team.</div>
              </div>
            </label>
          </div>

          {publishNow && (
            <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/30 flex items-start gap-3">
              <input type="checkbox" checked={publishConfirmed} onChange={e => setPublishConfirmed(e.target.checked)} className="mt-1 text-orange-600 focus:ring-orange-500 rounded" />
              <label className="text-sm text-orange-800 dark:text-orange-300 cursor-pointer" onClick={() => setPublishConfirmed(!publishConfirmed)}>
                I've reviewed all generated content and confirm it's accurate and ready for salesmen to see.
              </label>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} disabled={isSaving} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Back
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving || (publishNow && !publishConfirmed)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl font-medium transition shadow-sm"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Saving...' : 'Save Package'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success */}
      {step === 5 && successData && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-12 animate-fade-in border border-gray-100 dark:border-gray-800 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold dark:text-gray-100 mb-4">Package Saved!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The complete training package for {wizardData.name} has been successfully {publishNow ? 'published' : 'saved as draft'}.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => router.push(`/admin/tools/${successData.toolId}/tree`)} className="w-full bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-sm">
              View Tool Tree
            </button>
            <button onClick={() => router.push('/admin/tools')} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-200 px-6 py-3 rounded-xl font-medium transition">
              Back to Tools
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tree View Helper Component ──────────────────────────────────────────

function TreeView({ packageData, toggleRemoval, updateItem }: { 
  packageData: GeneratedToolPackage, 
  toggleRemoval: (t: string, p: number[]) => void,
  updateItem: (t: string, p: number[], f: string, v: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'course': true,
    'faqs': true,
    'objections': true,
    'scripts': true,
    'voice_notes': true
  })

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const EditableField = ({ value, onChange, isTextArea = false }: { value: string, onChange: (v: string) => void, isTextArea?: boolean }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [val, setVal] = useState(value)
    
    if (isEditing) {
      return (
        <div className="flex gap-2 w-full max-w-lg items-start mt-1">
          {isTextArea ? (
            <textarea value={val} onChange={e => setVal(e.target.value)} className="flex-1 p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" rows={3} autoFocus />
          ) : (
            <input value={val} onChange={e => setVal(e.target.value)} className="flex-1 p-1 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" autoFocus />
          )}
          <button onClick={() => { onChange(val); setIsEditing(false) }} className="p-1.5 bg-brand-600 text-white rounded"><Check className="w-4 h-4"/></button>
        </div>
      )
    }

    return (
      <span className="group relative inline-block">
        <span className="dark:text-gray-300 font-sans">{value}</span>
        <button onClick={() => setIsEditing(true)} className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-brand-600 transition inline-flex">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </span>
    )
  }

  const NodeItem = ({ 
    label, value, type, path, field, removed, isTextArea, isLast = false, level = 0
  }: any) => {
    return (
      <div className={`flex group ${removed ? 'opacity-50 grayscale' : ''}`}>
        <div className="text-gray-300 dark:text-gray-600 select-none mr-2 flex">
          {Array(level).fill('│   ').join('')}{isLast ? '└── ' : '├── '}
        </div>
        <div className="flex-1 py-1">
          <span className="font-medium text-gray-500 dark:text-gray-400 text-xs uppercase mr-2">{label}:</span>
          {removed ? <span className="line-through text-gray-400 font-sans">{value}</span> : 
            <EditableField value={value} onChange={v => updateItem(type, path, field, v)} isTextArea={isTextArea} />}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
      
      {/* Course */}
      <div className="mb-4">
        <div className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200 font-bold" onClick={() => toggle('course')}>
          {expanded['course'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Course
        </div>
        {expanded['course'] && (
          <div className="ml-6 mt-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-4">
            <div>
              <span className="font-bold">Title:</span> <span className="font-sans dark:text-gray-300">{packageData.course.title}</span>
            </div>
            {packageData.course.modules.map((m, mi) => (
              <div key={mi} className={`relative ${m._removed ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 mb-1">
                  ├── Module {mi+1}: {m.title}
                  <button onClick={() => toggleRemoval('module', [mi])} className="text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition"><X className="w-3 h-3"/></button>
                </div>
                <div className="ml-8 border-l-2 border-gray-100 dark:border-gray-800 pl-4 space-y-2">
                  {m.lessons.map((l, li) => (
                    <div key={li} className={`relative ${l._removed ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2 font-medium text-gray-600 dark:text-gray-400 group">
                        ├── Lesson {li+1}: {l.title}
                        <button onClick={() => toggleRemoval('lesson', [mi, li])} className="text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition"><X className="w-3 h-3"/></button>
                      </div>
                      <div className="ml-8 space-y-1 my-1">
                        {l.content_blocks.map((b, bi) => (
                          <NodeItem key={bi} label={b.type} value={b.type === 'heading' ? b.content.text : b.content.body} 
                            type="block" path={[mi, li, bi]} field={b.type === 'heading' ? 'text' : 'body'} removed={m._removed || l._removed} isTextArea={b.type === 'text'} level={1} isLast={bi === l.content_blocks.length - 1} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQs */}
      <div className="mb-4">
        <div className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200 font-bold" onClick={() => toggle('faqs')}>
          {expanded['faqs'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          FAQs ({packageData.faqs.length})
        </div>
        {expanded['faqs'] && (
          <div className="ml-6 mt-2 space-y-4">
            {packageData.faqs.map((faq, i) => (
              <div key={i} className="relative group">
                <div className="absolute -left-6 top-1 text-gray-300 dark:text-gray-600">├──</div>
                <button onClick={() => toggleRemoval('faq', [i])} className="absolute -left-10 top-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition"><X className="w-4 h-4"/></button>
                <div className="space-y-1">
                  <NodeItem label="Q" value={faq.question} type="faq" path={[i]} field="question" removed={faq._removed} isTextArea />
                  <NodeItem label="A" value={faq.short_answer} type="faq" path={[i]} field="short_answer" removed={faq._removed} isTextArea isLast />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Objections */}
      <div className="mb-4">
        <div className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200 font-bold" onClick={() => toggle('objections')}>
          {expanded['objections'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Objections ({packageData.objections.length})
        </div>
        {expanded['objections'] && (
          <div className="ml-6 mt-2 space-y-4">
            {packageData.objections.map((obj, i) => (
              <div key={i} className="relative group">
                <div className="absolute -left-6 top-1 text-gray-300 dark:text-gray-600">├──</div>
                <button onClick={() => toggleRemoval('objection', [i])} className="absolute -left-10 top-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition"><X className="w-4 h-4"/></button>
                <div className="space-y-1">
                  <NodeItem label="Say" value={obj.objection_text} type="objection" path={[i]} field="objection_text" removed={obj._removed} isTextArea />
                  <NodeItem label="Resp" value={obj.recommended_response} type="objection" path={[i]} field="recommended_response" removed={obj._removed} isTextArea isLast />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scripts */}
      <div className="mb-4">
        <div className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200 font-bold" onClick={() => toggle('scripts')}>
          {expanded['scripts'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Scripts ({packageData.scripts.length})
        </div>
        {expanded['scripts'] && (
          <div className="ml-6 mt-2 space-y-4">
            {packageData.scripts.map((script, i) => (
              <div key={i} className="relative group">
                <div className="absolute -left-6 top-1 text-gray-300 dark:text-gray-600">├──</div>
                <button onClick={() => toggleRemoval('script', [i])} className="absolute -left-10 top-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition"><X className="w-4 h-4"/></button>
                <div className="space-y-1">
                  <NodeItem label="Type" value={script.script_type} type="script" path={[i]} field="script_type" removed={script._removed} />
                  <NodeItem label="Content" value={script.content} type="script" path={[i]} field="content" removed={script._removed} isTextArea isLast />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Notes */}
      <div>
        <div className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200 font-bold" onClick={() => toggle('voice_notes')}>
          {expanded['voice_notes'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Voice Notes ({packageData.voice_notes?.length || 0})
        </div>
        {expanded['voice_notes'] && (
          <div className="ml-6 mt-2 space-y-4">
            {packageData.voice_notes?.map((vn, i) => (
              <div key={i} className="relative group">
                <div className="absolute -left-6 top-1 text-gray-300 dark:text-gray-600">{i === (packageData.voice_notes?.length || 0) - 1 ? '└──' : '├──'}</div>
                <button onClick={() => toggleRemoval('voice_note', [i])} className="absolute -left-10 top-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition"><X className="w-4 h-4"/></button>
                <div className="space-y-1">
                  <NodeItem label="Title" value={vn.title} type="voice_note" path={[i]} field="title" removed={vn._removed} />
                  <NodeItem label="Purpose" value={vn.purpose} type="voice_note" path={[i]} field="purpose" removed={vn._removed} />
                  <NodeItem label="Transcript" value={vn.transcript} type="voice_note" path={[i]} field="transcript" removed={vn._removed} isTextArea isLast />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
