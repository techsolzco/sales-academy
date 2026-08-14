import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AssignmentsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: assignments } = await supabase.from('assignments').select('*, course:courses(title), lesson:lessons(title)').order('created_at', { ascending: false })
  const { data: submissions } = await supabase.from('assignment_submissions').select('assignment_id, status')

  const stats = assignments?.map(a => {
    const subs = submissions?.filter(s => s.assignment_id === a.id) || []
    return {
      ...a,
      submissionCount: subs.length,
      pendingCount: subs.filter(s => s.status === 'pending').length
    }
  }) || []

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500 mt-1">Manage course assignments and review submissions.</p>
        </div>
        <Link
          href="/admin/assignments/new"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Assignment
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Context</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <p>No assignments created yet.</p>
                </td>
              </tr>
            ) : (
              stats.map((assignment: any) => (
                <tr key={assignment.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {}}>
                  <td className="px-6 py-4">
                    <Link href={`/admin/assignments/${assignment.id}`} className="font-medium text-gray-900 block hover:text-brand-600">
                      {assignment.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-medium">{assignment.course?.title}</div>
                    {assignment.lesson && <div className="text-xs text-gray-400">{assignment.lesson.title}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {assignment.submissionCount} total
                      </span>
                      {assignment.pendingCount > 0 && (
                        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {assignment.pendingCount} pending
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
