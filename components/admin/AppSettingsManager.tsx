'use client'

import { useState, useTransition } from 'react'
import { Save, Loader2, MessageSquare } from 'lucide-react'
import { updateWelcomeMessage } from '@/lib/actions/app-settings'

export function AppSettingsManager({ initialWelcome }: { initialWelcome: string }) {
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcome)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await updateWelcomeMessage(welcomeMessage)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Welcome Message</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">Shown as a popup to newly-approved students on their first login.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Popup Template</label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Use <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-brand-600">{`{name}`}</code> to insert the student's first name.</p>
          <textarea
            value={welcomeMessage}
            onChange={e => setWelcomeMessage(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 resize-none"
            placeholder="Welcome {name}! We're excited..."
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow-sm"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
