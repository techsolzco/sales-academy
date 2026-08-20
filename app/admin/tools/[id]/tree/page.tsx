import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchToolTree } from '@/lib/actions/tool-onboard'
import { ToolTreeView } from '@/components/admin/ToolTreeView'
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
      <div className="p-8 max-w-5xl">
        <p className="text-red-500">Tool not found or error loading data.</p>
      </div>
    )
  }

  const { tool, course, faqs, objections, scripts } = result.data

  // Fetch additional counts not in the tree
  const { count: quizCount } = await supabase
    .from('quizzes')
    .select('id', { count: 'exact', head: true })
    .eq('tool_id', tool.id)

  const { count: vnCount } = await supabase
    .from('voice_notes')
    .select('id', { count: 'exact', head: true })
    .eq('tool_id', tool.id)

  const cards = [
    { title: 'Course', count: course ? 1 : 0, href: `/admin/courses/${course?.id}`, icon: '🎓', color: 'bg-blue-50 text-blue-700' },
    { title: 'FAQs', count: faqs.length, href: `/admin/faqs?tool=${tool.id}`, icon: '❓', color: 'bg-emerald-50 text-emerald-700' },
    { title: 'Scripts', count: scripts.length, href: `/admin/scripts?tool=${tool.id}`, icon: '💬', color: 'bg-violet-50 text-violet-700' },
    { title: 'Objections', count: objections.length, href: `/admin/objections?tool=${tool.id}`, icon: '🛡️', color: 'bg-amber-50 text-amber-700' },
    { title: 'Quizzes', count: quizCount ?? 0, href: `/admin/quizzes?tool=${tool.id}`, icon: '📝', color: 'bg-rose-50 text-rose-700' },
    { title: 'Voice Notes', count: vnCount ?? 0, href: `/admin/voice-notes?tool=${tool.id}`, icon: '🎙️', color: 'bg-cyan-50 text-cyan-700' },
  ]

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
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

      <ToolTreeView data={result.data} />
    </div>
  )
}
