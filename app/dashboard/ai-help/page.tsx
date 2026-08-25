import { AiHelpChat } from './AiHelpChat'
import { getAiTrainingSettings } from '@/lib/actions/ai-assist'
import { createClient } from '@/lib/supabase/server'
import { BotOff } from 'lucide-react'

export default async function AiHelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  
  const settings = await getAiTrainingSettings()
  const studentAiEnabled = settings?.student_ai_access_enabled ?? true
  
  const isAdmin = profile?.role === 'admin'
  
  if (!isAdmin && !studentAiEnabled) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <BotOff className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">AI Features Disabled</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          AI assistance is currently disabled by the administrator. Please reach out to your manager for help with customer objections.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full px-4 py-5 md:px-8 md:py-6 max-w-2xl">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ask AI</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Describe a real customer situation or objection and get a suggested WhatsApp reply.
        </p>
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
          ⚠️ Review before sending — AI suggestions may not always be accurate.
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <AiHelpChat />
      </div>
    </div>
  )
}
