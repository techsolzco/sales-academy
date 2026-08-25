'use client'

import React, { useState } from 'react'
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Save, Loader2 } from 'lucide-react'
import { syncQuizQuestions } from '@/lib/actions/quizzes'

export function QuizQuestionBuilder({ quizId, initialQuestions = [] }: { quizId: string, initialQuestions?: any[] }) {
  const [questions, setQuestions] = useState<any[]>(
    initialQuestions.map(q => ({
      ...q,
      options: q.options ? [...q.options].sort((a, b) => a.order_index - b.order_index) : []
    })).sort((a, b) => a.order_index - b.order_index)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: 'new-' + Date.now(),
        question_text: '',
        points: 1,
        options: [
          { id: 'new-opt-' + Date.now() + '-1', option_text: '', is_correct: true },
          { id: 'new-opt-' + Date.now() + '-2', option_text: '', is_correct: false }
        ]
      }
    ])
  }

  const updateQuestion = (qIndex: number, text: string) => {
    const next = [...questions]
    next[qIndex].question_text = text
    setQuestions(next)
  }

  const removeQuestion = (qIndex: number) => {
    if (!confirm('Remove this question?')) return
    const next = [...questions]
    next.splice(qIndex, 1)
    setQuestions(next)
  }

  const addOption = (qIndex: number) => {
    const next = [...questions]
    next[qIndex].options.push({
      id: 'new-opt-' + Date.now(),
      option_text: '',
      is_correct: false
    })
    setQuestions(next)
  }

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const next = [...questions]
    next[qIndex].options[oIndex].option_text = text
    setQuestions(next)
  }

  const removeOption = (qIndex: number, oIndex: number) => {
    const next = [...questions]
    next[qIndex].options.splice(oIndex, 1)
    setQuestions(next)
  }

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const next = [...questions]
    next[qIndex].options.forEach((o: any, i: number) => {
      o.is_correct = i === oIndex
    })
    setQuestions(next)
  }

  const handleSave = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) return setError(`Question ${i + 1} is empty.`)
      if (q.options.length < 2) return setError(`Question ${i + 1} must have at least 2 options.`)
      const hasCorrect = q.options.some((o: any) => o.is_correct)
      if (!hasCorrect) return setError(`Question ${i + 1} must have a correct option selected.`)
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].option_text.trim()) return setError(`Question ${i + 1}, option ${j + 1} is empty.`)
      }
    }

    setError(null)
    setSuccess(false)
    setIsSaving(true)
    const res = await syncQuizQuestions(quizId, questions)
    setIsSaving(false)
    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">Questions</h2>
        <button onClick={addQuestion} className="flex items-center gap-1 px-4 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg font-medium text-sm transition">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">Questions saved successfully!</div>}

      <div className="space-y-6">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No questions added yet. Click "Add Question" to start.
          </div>
        ) : (
          questions.map((q, qIndex) => (
            <div key={q.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
              <div className="flex gap-3 mb-4">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mt-2">
                  {qIndex + 1}
                </span>
                <div className="flex-1">
                  <textarea
                    value={q.question_text}
                    onChange={e => updateQuestion(qIndex, e.target.value)}
                    placeholder="Enter question text..."
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <button onClick={() => removeQuestion(qIndex)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg self-start">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="pl-9 space-y-2">
                {q.options.map((o: any, oIndex: number) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectOption(qIndex, oIndex)}
                      className={`flex-shrink-0 p-1 rounded-full transition ${o.is_correct ? 'text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
                      title={o.is_correct ? 'Correct Answer' : 'Mark as Correct'}
                    >
                      {o.is_correct ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <input
                      type="text"
                      value={o.option_text}
                      onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                      className={`flex-1 p-2 border rounded-lg text-sm ${o.is_correct ? 'border-green-300 bg-green-50/30' : 'border-gray-300 bg-white'}`}
                    />
                    <button
                      onClick={() => removeOption(qIndex, oIndex)}
                      disabled={q.options.length <= 2}
                      className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {q.options.length < 6 && (
                  <button
                    onClick={() => addOption(qIndex)}
                    className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 mt-2"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {questions.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Questions
          </button>
        </div>
      )}
    </div>
  )
}
