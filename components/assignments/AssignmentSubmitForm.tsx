'use client'

import { useState } from 'react'
import { submitAssignment } from '@/lib/actions/assignments'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud, FileText } from 'lucide-react'

interface Props {
  assignmentId: string
  assignmentTitle: string
}

export function AssignmentSubmitForm({ assignmentId, assignmentTitle }: Props) {
  const [responseText, setResponseText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let fileUrl = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${assignmentId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('assignment-files').upload(path, file)
        if (uploadError) throw uploadError
        
        // We'll just store the path
        fileUrl = path
      }

      const res = await submitAssignment(assignmentId, responseText, fileUrl || undefined)
      if (res.error) throw new Error(res.error)
      setSuccess(true)
    } catch (err: any) {
      alert(err.message || 'Error submitting assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 text-green-700 p-6 rounded-2xl border border-green-100 text-center">
        <h3 className="text-lg font-bold mb-2">Assignment Submitted!</h3>
        <p className="text-sm">Your work has been submitted for review. You will be notified once it's graded.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
        <textarea
          rows={6}
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Attach File (Optional)</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors relative">
          <div className="space-y-1 text-center">
            {file ? (
              <FileText className="mx-auto h-12 w-12 text-brand-500" />
            ) : (
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div className="flex text-sm text-gray-600 justify-center">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500">
                <span>{file ? file.name : 'Upload a file'}</span>
                <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            {!file && <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting || (!responseText.trim() && !file)}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
        </button>
      </div>
    </form>
  )
}
