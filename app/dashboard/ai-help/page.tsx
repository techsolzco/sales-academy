import { AiHelpChat } from './AiHelpChat'

export default function AiHelpPage() {
  return (
    <div className="p-6 md:p-8 max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ask AI</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe a real customer situation or objection and get a suggested WhatsApp reply.
        </p>
        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          ⚠️ Review before sending — AI suggestions may not always be accurate.
        </div>
      </div>
      <AiHelpChat />
    </div>
  )
}
