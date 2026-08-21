import { AiHelpChat } from './AiHelpChat'

export default function AiHelpPage() {
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
