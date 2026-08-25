'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuiz, updateQuiz } from '@/lib/actions/quizzes'
import { Plus, Trash, CheckCircle } from 'lucide-react'
import { QuizQuestionBuilder } from './QuizQuestionBuilder'

interface Props {
  quizId: string | null
  initialData?: any
  lessons: { id: string; title: string }[]
}

export function QuizEditor({ quizId, initialData, lessons }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [lessonId, setLessonId] = useState(initialData?.lesson_id || '')
  const [passScore, setPassScore] = useState(initialData?.pass_score || 80)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // In a full implementation we would manage questions here too
  const [questions, setQuestions] = useState<any[]>(initialData?.questions || [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload = { title, description, lesson_id: lessonId || null, pass_score: passScore }
    let result
    if (quizId) {
      result = await updateQuiz(quizId, payload)
    } else {
      result = await createQuiz(payload)
    }

    setIsSubmitting(false)
    if (result.error) alert(result.error)
    else {
      router.push('/admin/quizzes')
      router.refresh()
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">{quizId ? 'Edit' : 'New'} Quiz</h1>
      
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Quiz Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-2 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Related Lesson</label>
              <select value={lessonId} onChange={e => setLessonId(e.target.value)} className="w-full border p-2 rounded-xl">
                <option value="">None</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded-xl" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Passing Score ({passScore}%)</label>
            <input type="range" min="0" max="100" value={passScore} onChange={e => setPassScore(Number(e.target.value))} className="w-full" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSubmitting} className="bg-brand-600 text-white px-6 py-2 rounded-xl font-medium">
              Save Settings
            </button>
          </div>
        </form>
      </div>

      {quizId && (
        <QuizQuestionBuilder quizId={quizId} initialQuestions={initialData?.questions || []} />
      )}
    </div>
  )
}
