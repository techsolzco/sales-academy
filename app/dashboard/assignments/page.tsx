import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchMyAssignments } from '@/lib/actions/assignments'

export const dynamic = 'force-dynamic'

export default async function AssignmentsStudentPage() {
  // B40: scoped server-side — only assignments for this student's assigned
  // courses/tools/lessons (plus general ones), with their own submissions.
  const items = await fetchMyAssignments()

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assignments</h1>
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
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    item.submission?.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    item.submission?.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    item.submission?.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                    isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {item.submission ? item.submission.status : (isOverdue ? 'Overdue' : 'To Do')}
                  </span>
                  {item.due_date && (
                    <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{(item as any).course?.title}</p>
                
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Link href={`/dashboard/assignments/${item.id}`} className="block w-full py-2 text-center rounded-xl bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50 transition-colors">
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

