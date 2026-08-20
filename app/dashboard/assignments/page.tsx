import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import Link from 'next/link'
import { ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function AssignmentsStudentPage() {
  const supabase = await createClient()
  const { userId } = await getEffectiveUser()

  const { data: assignments } = await supabase.from('assignments').select('*, course:courses(title)')
  const { data: submissions } = await supabase.from('assignment_submissions').select('*').eq('user_id', userId)

  const items = assignments?.map(a => {
    const sub = submissions?.find(s => s.assignment_id === a.id)
    return { ...a, submission: sub }
  }) || []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-gray-500 mt-1">Complete your course assignments and track progress.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState 
          icon={ClipboardList} 
          title="No assignments yet" 
          description="When your instructors assign tasks, they will appear here." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map(item => {
            const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.submission
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    item.submission?.status === 'approved' ? 'bg-green-100 text-green-700' :
                    item.submission?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    item.submission?.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.submission ? item.submission.status : (isOverdue ? 'Overdue' : 'To Do')}
                  </span>
                  {item.due_date && (
                    <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 mb-6">{item.course?.title}</p>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <Link href={`/dashboard/assignments/${item.id}`} className="block w-full py-2 text-center rounded-xl bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 transition-colors">
                    {item.submission ? 'View Submission' : 'Submit Assignment'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
