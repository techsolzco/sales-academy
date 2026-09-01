import { TranslatorWidget } from './TranslatorWidget'

export default function TranslatePage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Universal Translator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
          Translate customer messages instantly into your preferred language.
        </p>
      </div>
      <TranslatorWidget />
    </div>
  )
}
