'use client'

import { useState, useTransition } from 'react'
import { saveEnglishPracticeSettings } from '@/lib/actions/english-practice'
import { Loader2, Save } from 'lucide-react'

export function EnglishPracticeForm({ initialSettings }: { initialSettings: any }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personaInstructions, setPersonaInstructions] = useState(initialSettings?.persona_instructions || '')

  const handleSave = () => {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await saveEnglishPracticeSettings(personaInstructions)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
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
        <label className="block text-sm font-medium text-gray-700 mb-2">English Tutor Persona Instructions</label>
        <textarea
          value={personaInstructions}
          onChange={(e) => setPersonaInstructions(e.target.value)}
          rows={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
          placeholder="e.g. You are a friendly English tutor helping salespeople practice conversational English..."
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
  )
}
