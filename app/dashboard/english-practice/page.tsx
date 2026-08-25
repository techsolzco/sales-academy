import { EnglishPracticeChat } from './EnglishPracticeChat'
import { getAiTrainingSettings } from '@/lib/actions/ai-assist'
import { createClient } from '@/lib/supabase/server'
import { BotOff } from 'lucide-react'

export default async function EnglishPracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  
  const settings = await getAiTrainingSettings()
  const studentAiEnabled = settings?.student_ai_access_enabled ?? true
  
  const isAdmin = profile?.role === 'admin'
  
  if (!isAdmin && !studentAiEnabled) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
        <BotOff className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">AI Features Disabled</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          AI English Practice is currently disabled by the administrator. Please reach out to your manager if you need assistance.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl animate-fade-in mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">English Practice</h1>
        <p className="text-sm text-gray-500 mt-1">
          Practice English with your personal AI tutor
        </p>
      </div>
      <EnglishPracticeChat />
    </div>
  )
}
