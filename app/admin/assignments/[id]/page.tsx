import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionReviewer } from '@/components/admin/SubmissionReviewer'
import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: assignment } = await supabase.from('assignments')
    .select('*, course:courses(title), lesson:lessons(title)')
    .eq('id', params.id).single()

  if (!assignment) return <div>Not found</div>

  const { data: submissions } = await supabase.from('assignment_submissions')
    .select('*, profile:profiles(id,full_name,email,avatar_url)')
    .eq('assignment_id', params.id)
    .order('submitted_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/admin/assignments" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Assignments
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <p className="text-gray-500 mt-1">
              {assignment.course?.title} {assignment.lesson && `· ${assignment.lesson.title}`}
            </p>
          </div>
          <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
            <Edit className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap">
          {assignment.instructions}
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">Submissions ({submissions?.length || 0})</h2>
      
      <div className="space-y-4">
        {submissions?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed text-gray-500">
            No submissions yet.
          </div>
        ) : (
          submissions?.map(sub => (
            <SubmissionReviewer key={sub.id} submission={sub as any} />
          ))
        )}
      </div>
    </div>
  )
}
