'use client'

import { useState } from 'react'
import { reviewSubmission } from '@/lib/actions/assignments'
import type { AssignmentSubmission } from '@/types'
import { Check, X, FileText, Image, Link, Star } from 'lucide-react'

interface Props {
  submission: AssignmentSubmission
  linkedQuizResult?: { passed: boolean; percentage: number; score: number } | null
}

export function SubmissionReviewer({ submission, linkedQuizResult }: Props) {
  const [isReviewing, setIsReviewing] = useState(false)
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved')
  const [score, setScore] = useState<string>(submission.score?.toString() || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(submission.status)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const numScore = score !== '' ? parseInt(score, 10) : null
    const result = await reviewSubmission(submission.id, status, feedback, numScore)
    setIsSubmitting(false)
    if (result.error) {
      alert(result.error)
    } else {
      setCurrentStatus(status)
      setIsReviewing(false)
    }
  }

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {submission.profile?.full_name || 'Student'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {submission.score != null && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
              <Star className="w-3 h-3" /> {submission.score}/100
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColors[currentStatus]}`}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Quiz result badge */}
      {linkedQuizResult && (
        <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${linkedQuizResult.passed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {linkedQuizResult.passed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          Quiz: {linkedQuizResult.percentage}% — {linkedQuizResult.passed ? 'Passed' : 'Failed'}
        </div>
      )}

      {/* Text response */}
      {submission.response_text && (
        <div className="bg-gray-50 dark:bg-gray-900 p-3.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
          {submission.response_text}
        </div>
      )}

      {/* Proof attachments */}
      <div className="flex flex-wrap gap-2 mb-4">
        {submission.image_url && (
          <a
            href={submission.image_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition-colors"
          >
            <Image className="w-4 h-4" /> View Photo
          </a>
        )}
        {submission.media_link && (
          <a
            href={submission.media_link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-medium transition-colors"
          >
            <Link className="w-4 h-4" /> Open Media Link
          </a>
        )}
        {submission.file_url && (
          <a
            href={submission.file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" /> File Attachment
          </a>
        )}
      </div>

      {/* Existing feedback */}
      {submission.feedback && currentStatus !== 'pending' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-3 rounded-xl text-sm mb-4 border border-blue-100 dark:border-blue-800">
          <p className="text-xs font-semibold mb-1">Feedback given:</p>
          {submission.feedback}
        </div>
      )}

      {/* Review actions */}
      {currentStatus === 'pending' && !isReviewing && (
        <div className="flex gap-2">
          <button
            onClick={() => { setStatus('approved'); setIsReviewing(true) }}
            className="flex items-center gap-1 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4" /> Approve
          </button>
          <button
            onClick={() => { setStatus('rejected'); setIsReviewing(true) }}
            className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" /> Reject
          </button>
        </div>
      )}

      {isReviewing && (
        <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {status === 'approved' ? '✅ Approve' : '❌ Reject'} submission
          </h4>

          {/* Score */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Score (0–100, optional)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 85"
              className="w-32 px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              rows={3}
              placeholder="Add feedback for the student..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsReviewing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isSubmitting ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
