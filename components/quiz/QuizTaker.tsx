'use client'

import { useState } from 'react'
import { submitQuizAttempt } from '@/lib/actions/quizzes'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props {
  quiz: any
}

export function QuizTaker({ quiz }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleSubmit = async () => {
    // Basic validation
    if (Object.keys(answers).length < (quiz.questions?.length || 0)) {
      alert('Please answer all questions before submitting.')
      return
    }

    setIsSubmitting(true)
    const answersArray = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }))
    const res = await submitQuizAttempt(quiz.id, answersArray)
    setIsSubmitting(false)

    if (res.error) {
      alert(res.error)
    } else {
      // Since it's a mock evaluation in the action, we'll fake the UI result state here just to show the results screen
      // In a real app we might fetch the result from DB or return it from the action
      let score = 0
      quiz.questions?.forEach((q: any) => {
        const selected = answers[q.id]
        const opt = q.options?.find((o: any) => o.id === selected)
        if (opt?.is_correct) score += q.points
      })
      const totalPoints = quiz.questions?.reduce((acc: number, q: any) => acc + q.points, 0) || 100
      const percentage = Math.round((score / totalPoints) * 100)
      const passed = percentage >= quiz.pass_score

      setResult({ score, totalPoints, percentage, passed })
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
          {result.passed ? (
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12" />
            </div>
          ) : (
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12" />
            </div>
          )}
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {result.passed ? 'Congratulations!' : 'Keep Trying!'}
          </h2>
          <p className="text-gray-500 mb-8">
            You scored <span className="font-bold text-gray-900">{result.score}</span> out of {result.totalPoints} points
          </p>
          
          <div className="mb-8">
            <div className="text-5xl font-black mb-2">{result.percentage}%</div>
            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {result.passed ? 'Passed' : 'Failed'}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={() => { setAnswers({}); setResult(null) }} className="px-6 py-3 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-colors">
              Try Again
            </button>
            <a href={`/dashboard/training`} className="px-6 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors">
              Back to Training
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
        {quiz.description && <p className="text-gray-500">{quiz.description}</p>}
      </div>

      <div className="space-y-8 mb-8">
        {quiz.questions?.map((q: any, index: number) => (
          <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              <span className="text-brand-600 mr-2">{index + 1}.</span>
              {q.question_text}
            </h3>
            <p className="text-sm text-gray-400 mb-6">{q.points} points</p>
            
            <div className="space-y-3">
              {q.options?.map((opt: any) => {
                const isSelected = answers[q.id] === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(q.id, opt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-brand-600 bg-brand-50' 
                        : 'border-gray-100 hover:border-brand-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-brand-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                      </div>
                      <span className={`font-medium ${isSelected ? 'text-brand-900' : 'text-gray-700'}`}>
                        {opt.option_text}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  )
}
