import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DailyReportFilters } from './DailyReportFilters'
import { fetchActiveSalesmen } from '@/lib/actions/view-as-student'
import Link from 'next/link'

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: { date?: string; userId?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const date = searchParams.date || new Date().toISOString().split('T')[0]
  const userId = searchParams.userId

  const salesmen = await fetchActiveSalesmen()

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const isoStart = startOfDay.toISOString()
  const isoEnd = endOfDay.toISOString()

  // 1. Lessons
  let lessonsQ = supabase.from('lesson_progress').select(`
    user_id, completed_at,
    profiles ( full_name, avatar_url ),
    lessons ( title )
  `).eq('completed', true).gte('completed_at', isoStart).lt('completed_at', isoEnd)
  
  // 2. Script copies
  let scriptsQ = supabase.from('script_copies').select(`
    user_id, copied_at,
    scripts ( title )
  `).gte('copied_at', isoStart).lt('copied_at', isoEnd)
  
  // 3. Quiz attempts
  let quizzesQ = supabase.from('quiz_attempts').select(`
    user_id, completed_at, score, max_score, percentage, passed,
    quizzes ( title )
  `).gte('completed_at', isoStart).lt('completed_at', isoEnd)
  
  // 4. Assignments
  let assignmentsQ = supabase.from('assignment_submissions').select(`
    user_id, submitted_at, status,
    assignments ( title )
  `).gte('submitted_at', isoStart).lt('submitted_at', isoEnd)

  // 5. KB items reviewed
  let kbQ = supabase.from('kb_reviews').select(`
    user_id, reviewed_at, content_type, content_id
  `).gte('reviewed_at', isoStart).lt('reviewed_at', isoEnd)

  if (userId) {
    lessonsQ = lessonsQ.eq('user_id', userId)
    scriptsQ = scriptsQ.eq('user_id', userId)
    quizzesQ = quizzesQ.eq('user_id', userId)
    assignmentsQ = assignmentsQ.eq('user_id', userId)
    kbQ = kbQ.eq('user_id', userId)
  }

  const [
    { data: lessons },
    { data: scripts },
    { data: quizzes },
    { data: assignments },
    { data: kb_reviews }
  ] = await Promise.all([
    lessonsQ,
    scriptsQ,
    quizzesQ,
    assignmentsQ,
    kbQ
  ])

  let content = null

  if (userId) {
    // Single student timeline
    const allActivities = [
      ...(lessons || []).map(l => ({ type: 'Lesson Completed', title: (l.lessons as any)?.title, time: l.completed_at, details: '' })),
      ...(scripts || []).map(s => ({ type: 'Script Copied', title: (s.scripts as any)?.title, time: s.copied_at, details: '' })),
      ...(quizzes || []).map(q => ({ type: 'Quiz Attempt', title: (q.quizzes as any)?.title, time: q.completed_at, details: `${q.score}/${q.max_score} (${q.passed ? 'Passed' : 'Failed'})` })),
      ...(assignments || []).map(a => ({ type: 'Assignment Submitted', title: (a.assignments as any)?.title, time: a.submitted_at, details: `Status: ${a.status}` })),
      ...(kb_reviews || []).map(k => ({ type: 'KB Reviewed', title: `${k.content_type} review`, time: k.reviewed_at, details: '' })),
    ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    if (allActivities.length === 0) {
      content = <div className="text-gray-500 py-10 text-center bg-white rounded-xl shadow-sm border border-gray-100">No activity recorded for this date.</div>
    } else {
      content = (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Activity Timeline</h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {allActivities.map((act, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-brand-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900">{act.type}</span>
                    <time className="text-xs font-medium text-brand-600">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </div>
                  <div className="text-sm text-gray-600">{act.title}</div>
                  {act.details && <div className="text-xs text-gray-500 mt-2 font-medium">{act.details}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  } else {
    // Summary table
    const summary = salesmen.map(s => {
      const sLessons = (lessons || []).filter(l => l.user_id === s.id).length
      const sScripts = (scripts || []).filter(sc => sc.user_id === s.id).length
      const sQuizzes = (quizzes || []).filter(q => q.user_id === s.id).length
      const sAssignments = (assignments || []).filter(a => a.user_id === s.id).length
      const sKb = (kb_reviews || []).filter(k => k.user_id === s.id).length
      return { ...s, sLessons, sScripts, sQuizzes, sAssignments, sKb }
    }).filter(s => s.sLessons > 0 || s.sScripts > 0 || s.sQuizzes > 0 || s.sAssignments > 0 || s.sKb > 0)

    if (summary.length === 0) {
      content = <div className="text-gray-500 py-10 text-center bg-white rounded-xl shadow-sm border border-gray-100">No activity recorded for this date.</div>
    } else {
      content = (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4 text-center">Lessons Done</th>
                <th className="px-6 py-4 text-center">KB Reviews</th>
                <th className="px-6 py-4 text-center">Scripts Copied</th>
                <th className="px-6 py-4 text-center">Quiz Attempts</th>
                <th className="px-6 py-4 text-center">Assignments</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.full_name}</td>
                  <td className="px-6 py-4 text-center">{s.sLessons}</td>
                  <td className="px-6 py-4 text-center">{s.sKb}</td>
                  <td className="px-6 py-4 text-center">{s.sScripts}</td>
                  <td className="px-6 py-4 text-center">{s.sQuizzes}</td>
                  <td className="px-6 py-4 text-center">{s.sAssignments}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/reports/daily?date=${date}&userId=${s.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }

  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Daily Activity Report</h1>
        <p className="text-sm text-gray-500 mt-1">Track student progress, completions, and activity on a daily basis.</p>
      </div>

      <DailyReportFilters salesmen={salesmen} />
      
      {content}
    </div>
  )
}
