import { EnglishPracticeChat } from './EnglishPracticeChat'

export default function EnglishPracticePage() {
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
