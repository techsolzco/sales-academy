import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, FileText } from 'lucide-react'
import { AssignmentSubmitForm } from '@/components/assignments/AssignmentSubmitForm'

export const dynamic = 'force-dynamic'

export default async function AssignmentStudentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: assignment } = await supabase.from('assignments').select('*, course:courses(title)').eq('id', params.id).single()
  if (!assignment) return <div>Not found</div>

  const { data: submission } = await supabase.from('assignment_submissions').select('*').eq('assignment_id', params.id).eq('user_id', user.id).single()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/assignments" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Assignments
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
        <p className="text-gray-500 text-sm mb-6">{assignment.course?.title}</p>
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
          {assignment.instructions}
        </div>
      </div>

      {submission ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">Your Submission</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              submission.status === 'approved' ? 'bg-green-100 text-green-700' :
              submission.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {submission.status}
            </span>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap mb-4">
            {submission.response_text || <span className="text-gray-400 italic">No text provided</span>}
          </div>

          {submission.file_url && (
            <div className="mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              <span className="text-sm font-medium text-gray-700">File attached</span>
            </div>
          )}

          {submission.feedback && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Instructor Feedback</h3>
              <div className="bg-blue-50 text-blue-900 p-4 rounded-xl text-sm whitespace-pre-wrap">
                {submission.feedback}
              </div>
            </div>
          )}
        </div>
      ) : (
        <AssignmentSubmitForm assignmentId={assignment.id} assignmentTitle={assignment.title} />
      )}
    </div>
  )
}
