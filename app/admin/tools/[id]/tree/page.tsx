import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchToolTree } from '@/lib/actions/tool-onboard'
import { ToolTreeView } from '@/components/admin/ToolTreeView'
import { QuizPerformancePanel } from '@/components/admin/QuizPerformancePanel'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function ToolTreePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const result = await fetchToolTree(params.id)

  if (result.error || !result.data) {
    return (
      <div className="px-4 py-5 md:p-8 max-w-5xl">
        <p className="text-red-500">Tool not found or error loading data.</p>
      </div>
    )
  }

  const { tool, course, faqs, objections, scripts } = result.data

  // Fetch quizzes for this tool
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, status').is('deleted_at', null)
    .eq('tool_id', tool.id)
    .order('created_at', { ascending: false })

  const quizList = quizzes ?? []
  const quizIds = quizList.map(q => q.id)

  // Fetch attempts if there are quizzes
  let quizAttempts: Array<{
    id: string
    quiz_id: string
    user_id: string
    score: number
    max_score: number
    percentage: number
    passed: boolean
    completed_at: string | null
    profile: { full_name: string | null; email: string } | null
  }> = []

  if (quizIds.length > 0) {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, user_id, score, max_score, percentage, passed, completed_at, profile:profiles(full_name, email)')
      .in('quiz_id', quizIds)
      .order('completed_at', { ascending: false })
      .limit(50)
    quizAttempts = (attempts ?? []) as unknown as typeof quizAttempts
  }

  // Fetch all tools for modal dropdowns
  const { data: allTools } = await supabase
    .from('tools')
    .select('id, name').is('deleted_at', null)
    .order('name')

  const toolsList = (allTools ?? []) as { id: string; name: string }[]

  const cards = [
    { title: 'Course', count: course ? 1 : 0, href: `/admin/courses/${course?.id}`, icon: '🎓', color: 'bg-blue-50 text-blue-700' },
    { title: 'FAQs', count: faqs.length, href: `/admin/faqs?tool=${tool.id}`, icon: '❓', color: 'bg-emerald-50 text-emerald-700' },
    { title: 'Scripts', count: scripts.length, href: `/admin/scripts?tool=${tool.id}`, icon: '💬', color: 'bg-violet-50 text-violet-700' },
    { title: 'Objections', count: objections.length, href: `/admin/objections?tool=${tool.id}`, icon: '🛡️', color: 'bg-amber-50 text-amber-700' },
    { title: 'Quizzes', count: quizList.length, href: `/admin/quizzes?tool=${tool.id}`, icon: '📝', color: 'bg-rose-50 text-rose-700' },
  ]

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Tools', href: '/admin/tools' },
        { label: tool.name },
        { label: 'Content Tree' },
      ]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          🌳 {tool.name} — Content Breakdown
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Click any card to view and manage specific content for this tool.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
          {cards.map(c => (
            <a
              key={c.title}
              href={c.count > 0 ? c.href : '#'}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 shadow-sm transition hover:scale-105 ${c.count === 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-full text-lg mb-2 ${c.color}`}>
                {c.icon}
              </div>
              <span className="text-xl font-bold text-gray-900">{c.count}</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">{c.title}</span>
            </a>
          ))}
        </div>
      </div>

      <ToolTreeView data={result.data} tools={toolsList} />

      <QuizPerformancePanel
        toolId={tool.id}
        quizzes={quizList}
        attempts={quizAttempts}
      />
    </div>
  )
}
