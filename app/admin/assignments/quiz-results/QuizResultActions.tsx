'use client'

import { useState } from 'react'
import { approveQuizAttempt, rejectQuizAttempt } from '@/lib/actions/quiz-approval'

export default function QuizResultActions({ attemptId }: { attemptId: string }) {
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    const res = await approveQuizAttempt(attemptId)
    setLoading(false)
    if (res.error) alert(res.error)
  }

  const handleReject = async () => {
    const notes = prompt('Enter rejection notes (optional):')
    if (notes === null) return // cancelled
    setLoading(true)
    const res = await rejectQuizAttempt(attemptId, notes)
    setLoading(false)
    if (res.error) alert(res.error)
  }

  return (
    <div className="flex gap-2">
      <button 
        onClick={handleApprove} 
        disabled={loading}
        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
      >
        Approve
      </button>
      <button 
        onClick={handleReject} 
        disabled={loading}
        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
      >
        Reject
      </button>
    </div>
  )
}
