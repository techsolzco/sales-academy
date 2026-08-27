'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { submitQuizAttempt } from '@/lib/actions/quizzes'

interface Props {
  quiz: any
}

export function QuizTaker({ quiz }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    score: number
    totalPoints: number
    percentage: number
    passed: boolean
    correctCount: number
    totalCount: number
  } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleSubmit = async () => {
    const questionCount = quiz.questions?.length || 0
    if (Object.keys(answers).length < questionCount) {
      alert(`Please answer all ${questionCount} questions before submitting.`)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const answersArray = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }))

    try {
      const res = await submitQuizAttempt(quiz.id, answersArray)

      if (res.error) {
        setSubmitError(res.error)
      } else if (res.data) {
        setResult({
          score: res.data.score,
          totalPoints: res.data.maxScore,
          percentage: Math.round(res.data.percentage),
          passed: res.data.passed,
          correctCount: res.data.correctCount,
          totalCount: res.data.totalCount,
        })
      }
    } catch (err: any) {
      setSubmitError('Submission failed — please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
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
          <p className="text-gray-500 mb-2">
            You got <span className="font-bold text-gray-900">{result.correctCount}</span> of {result.totalCount} questions correct
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Score: {result.score} / {result.totalPoints} points
          </p>

          <div className="mb-8">
            <div className="text-5xl font-black mb-2">{result.percentage}%</div>
            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {result.passed ? 'Passed' : 'Failed'}
            </div>
            <p className="text-xs text-gray-400 mt-2">Passing score: {quiz.pass_score}%</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => { setAnswers({}); setResult(null); setSubmitError(null) }}
              className="px-6 py-3 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
            <a href="/dashboard/training" className="px-6 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors">
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
        <p className="text-sm text-gray-400 mt-2">
          {quiz.questions?.length || 0} questions · Passing score: {quiz.pass_score}%
        </p>
      </div>

      <div className="space-y-8 mb-8">
        {quiz.questions?.map((q: any, index: number) => (
          <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              <span className="text-brand-600 mr-2">{index + 1}.</span>
              {q.question_text}
            </h3>
            <p className="text-sm text-gray-400 mb-6">{q.points || 1} point{(q.points || 1) !== 1 ? 's' : ''}</p>

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
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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

      {/* Progress indicator */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span>{Object.keys(answers).length} / {quiz.questions?.length || 0} answered</span>
        <span className="text-xs text-gray-400">All questions required</span>
      </div>

      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          ⚠️ {submitError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(answers).length < (quiz.questions?.length || 0)}
          className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  )
}
