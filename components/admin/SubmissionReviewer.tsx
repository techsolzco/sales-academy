'use client'

import { useState } from 'react'
import { reviewSubmission } from '@/lib/actions/assignments'
import type { AssignmentSubmission } from '@/types'
import { Check, X, FileText } from 'lucide-react'

interface Props {
  submission: AssignmentSubmission
}

export function SubmissionReviewer({ submission }: Props) {
  const [isReviewing, setIsReviewing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const result = await reviewSubmission(submission.id, status, feedback)
    setIsSubmitting(false)
    if (result.error) {
      alert(result.error)
    } else {
      setIsReviewing(false)
    }
  }

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{submission.profile?.full_name || 'Student'}</h3>
          <p className="text-sm text-gray-500">{new Date(submission.submitted_at).toLocaleString()}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColors[submission.status]}`}>
          {submission.status}
        </span>
      </div>

      <div className="mb-4">
        {submission.response_text && (
          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-2 whitespace-pre-wrap">
            {submission.response_text}
          </div>
        )}
        {submission.file_url && (
          <a href={submission.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <FileText className="w-4 h-4" /> View Attachment
          </a>
        )}
      </div>

      {submission.status === 'pending' && !isReviewing && (
        <div className="flex gap-2">
          <button onClick={() => { setStatus('approved'); setIsReviewing(true) }} className="flex items-center gap-1 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium">
            <Check className="w-4 h-4" /> Approve
          </button>
          <button onClick={() => { setStatus('rejected'); setIsReviewing(true) }} className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium">
            <X className="w-4 h-4" /> Reject
          </button>
        </div>
      )}

      {isReviewing && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Feedback ({status === 'approved' ? 'Approve' : 'Reject'})
          </h4>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-brand-500"
            rows={3}
            placeholder="Add feedback for the student..."
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsReviewing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {isSubmitting ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
