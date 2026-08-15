'use client'

import { useState, useTransition } from 'react'
import { saveAiTrainingSettings, testAiSettings } from '@/lib/actions/ai-assist'
import { AiTrainingSettings } from '@/types'
import { Loader2, Sparkles, Save, TestTube2 } from 'lucide-react'

export function AiTrainingForm({ initialSettings }: { initialSettings: AiTrainingSettings | null }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    persona_instructions: initialSettings?.persona_instructions || '',
    sales_style_rules: initialSettings?.sales_style_rules || '',
    locked_facts: initialSettings?.locked_facts || '',
    tone_examples: initialSettings?.tone_examples || ''
  })

  const [testInput, setTestInput] = useState('')
  const [testResponse, setTestResponse] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await saveAiTrainingSettings(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  const handleTest = async () => {
    if (!testInput.trim()) return
    setTestLoading(true)
    setTestError(null)
    setTestResponse(null)
    
    const result = await testAiSettings(testInput)
    if (result.error) {
      setTestError(result.error)
    } else if (result.data) {
      setTestResponse(result.data)
    }
    
    setTestLoading(false)
  }

  return (
    <div className="space-y-12">
      {/* Form Section */}
      <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-center">
            ✅ Settings saved successfully!
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Persona Instructions</label>
          <textarea
            name="persona_instructions"
            value={formData.persona_instructions}
            onChange={handleChange}
            rows={8}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            placeholder="e.g. You are Alex, a senior sales executive..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sales Style Rules</label>
          <textarea
            name="sales_style_rules"
            value={formData.sales_style_rules}
            onChange={handleChange}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            placeholder="e.g. Always be polite, use Hinglish naturally..."
          />
        </div>

        <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200">
          <label className="block text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
            Locked Facts <span className="text-amber-600 text-xs font-normal">(AI will never contradict these)</span>
          </label>
          <textarea
            name="locked_facts"
            value={formData.locked_facts}
            onChange={handleChange}
            rows={8}
            className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500 bg-white"
            placeholder="e.g. We do not offer refunds after 30 days. Our office is in Mumbai."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tone & Style Examples</label>
          <textarea
            name="tone_examples"
            value={formData.tone_examples}
            onChange={handleChange}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            placeholder="Provide sample interactions here..."
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Test Section */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TestTube2 className="w-5 h-5" /> 🧪 Test my AI
          </h2>
          <p className="text-brand-100 text-sm mt-1">
            Test how the AI responds to customer questions using your current saved settings.
          </p>
        </div>
        <div className="p-6 bg-gray-50">
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type a sample customer question..."
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 shadow-inner bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTest()
              }}
            />
            <button
              onClick={handleTest}
              disabled={testLoading || !testInput.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
            >
              {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Test AI
            </button>
          </div>

          {testError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 mb-4">
              {testError}
            </div>
          )}

          {testResponse && (
            <div className="bg-[#202123] rounded-xl p-5 shadow-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-3 text-brand-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">AI Response</span>
              </div>
              <p className="text-gray-100 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {testResponse}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
