'use client'

import { useState } from 'react'
import { submitAssignment } from '@/lib/actions/assignments'
import { CheckCircle, Type, Image, Link } from 'lucide-react'

interface Props {
  assignmentId: string
  assignmentTitle: string
}

export function AssignmentSubmitForm({ assignmentId, assignmentTitle }: Props) {
  const [responseText, setResponseText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [mediaLink, setMediaLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = responseText.trim() || imageUrl.trim() || mediaLink.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)

    const res = await submitAssignment(
      assignmentId,
      responseText || undefined,
      undefined,
      imageUrl || undefined,
      mediaLink || undefined,
    )

    setIsSubmitting(false)
    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 text-green-700 p-8 rounded-2xl border border-green-100 text-center">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
        <h3 className="text-lg font-bold mb-2">Assignment Submitted!</h3>
        <p className="text-sm text-green-600">
          Your work has been submitted for review. You will be notified once it's graded.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-900">Submit Your Work</h2>
        <p className="text-xs text-gray-500 mt-0.5">You can provide any combination of the options below</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Written response */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Type className="w-4 h-4 text-brand-600" />
            Written Response
          </label>
          <textarea
            rows={5}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Type your answer, summary, or notes here..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm resize-none"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Image className="w-4 h-4 text-indigo-600" />
            Photo Proof (Image URL)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste a link to your photo (e.g. from Google Photos, Imgur...)"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Upload your photo to Google Photos / Imgur / any image host and paste the link here
          </p>
        </div>

        {/* Media link */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Link className="w-4 h-4 text-purple-600" />
            Video / Audio Link
          </label>
          <input
            type="url"
            value={mediaLink}
            onChange={(e) => setMediaLink(e.target.value)}
            placeholder="Paste a Google Drive, YouTube unlisted, or WhatsApp share link..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            For video/audio proof — share the file via Drive/YouTube and paste the link
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
        <p className="text-xs text-gray-400">
          {!canSubmit ? 'Fill in at least one field above to submit' : 'Ready to submit'}
        </p>
        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 text-sm"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
        </button>
      </div>
    </form>
  )
}
