import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { BookOpen, Clock, CheckCircle, ChevronRight } from 'lucide-react'
import { getGreeting } from '@/lib/utils'

function ProgressRing({ pct }: { pct: number }) {
  const r = 20, c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg width="52" height="52" className="flex-shrink-0 -rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="#4f6ef7" strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="central" className="rotate-90"
        style={{ fontSize: 10, fill: '#374151', fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '26px 26px' }}>
        {pct}%
      </text>
    </svg>
  )
}

export default async function TrainingPage() {
  const supabase = await createClient()
  const { userId, profile } = await getEffectiveUser()

  // Get all assigned courses with their status
  const { data: assignments } = await supabase
    .from('course_assignments')
    .select('course_id, assigned_at, due_date')
    .eq('user_id', userId)

  if (!assignments || assignments.length === 0) {
    return (
      <div className="px-4 py-5 md:p-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">Your assigned training courses will appear here.</p>
        </div>
        <div className="text-center py-20 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          No courses assigned yet. Check back soon!
        </div>
      </div>
    )
  }

  const courseIds = assignments.map(a => a.course_id)

  // Fetch published courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*').is('deleted_at', null)
    .in('id', courseIds)
    .eq('status', 'published')

  if (!courses || courses.length === 0) {
    return (
      <div className="px-4 py-5 md:p-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
        </div>
        <div className="text-center py-20 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
          No published courses yet. Check back soon!
        </div>
      </div>
    )
  }

  // Get all lessons for these courses (for progress calc)
  const { data: modules } = await supabase
    .from('modules').select('id, course_id').is('deleted_at', null).in('course_id', courseIds)

  const moduleIds = (modules ?? []).map(m => m.id)
  const { data: lessons } = moduleIds.length > 0
    ? await supabase.from('lessons').select('id, module_id').is('deleted_at', null).in('module_id', moduleIds)
    : { data: [] }

  // Build course→lesson map
  const moduleCoursMap = Object.fromEntries((modules ?? []).map(m => [m.id, m.course_id]))
  const lessonsByCourse = (lessons ?? []).reduce<Record<string, string[]>>((acc, l) => {
    const cid = moduleCoursMap[l.module_id]
    if (cid) { if (!acc[cid]) acc[cid] = []; acc[cid].push(l.id) }
    return acc
  }, {})

  // Get user's lesson progress
  const lessonIds = (lessons ?? []).map(l => l.id)
  const { data: progress } = lessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
    : { data: [] }

  const completedSet = new Set((progress ?? []).map(p => p.lesson_id))

  // Fetch required KB items for courses linked to a tool
  const toolIds = Array.from(new Set(courses.map(c => c.tool_id).filter(Boolean))) as string[]
  const [{ data: allFaqs }, { data: allScripts }, { data: allObjections }, { data: allVoiceNotes }] = toolIds.length > 0
    ? await Promise.all([
        supabase.from('faqs').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published'),
        supabase.from('scripts').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published'),
        supabase.from('objections').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published'),
        supabase.from('voice_notes').select('id, tool_id').is('deleted_at', null).in('tool_id', toolIds).eq('status', 'published')
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const kbItems = [
    ...(allFaqs ?? []),
    ...(allScripts ?? []),
    ...(allObjections ?? []),
    ...(allVoiceNotes ?? [])
  ]

  const kbItemsByTool = kbItems.reduce((acc, item) => {
    if (!item.tool_id) return acc
    if (!acc[item.tool_id]) acc[item.tool_id] = []
    acc[item.tool_id].push(item.id)
    return acc
  }, {} as Record<string, string[]>)

  const allKbItemIds = kbItems.map(k => k.id)
  const { data: kbReviews } = allKbItemIds.length > 0
    ? await supabase.from('kb_reviews').select('content_id').eq('user_id', userId).in('content_id', allKbItemIds)
    : { data: [] }
    
  const reviewedKbIds = new Set((kbReviews ?? []).map(r => r.content_id))

  const assignmentByCourse = Object.fromEntries(assignments.map(a => [a.course_id, a]))

  return (
    <div className="px-4 py-5 md:p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {courses.length} course{courses.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {courses.map(course => {
          const allLessons = lessonsByCourse[course.id] ?? []
          const requiredKbIds = course.tool_id ? (kbItemsByTool[course.tool_id] ?? []) : []
          
          const completedLessonsCount = allLessons.filter(id => completedSet.has(id)).length
          const completedReviewsCount = requiredKbIds.filter(id => reviewedKbIds.has(id)).length
          
          const totalItems = allLessons.length + requiredKbIds.length
          const completedTotal = completedLessonsCount + completedReviewsCount
          const pct = totalItems > 0 ? Math.round((completedTotal / totalItems) * 100) : 0
          const isComplete = pct === 100 && totalItems > 0
          const assignment = assignmentByCourse[course.id]

          return (
            <Link
              key={course.id}
              href={`/dashboard/training/${course.id}`}
              className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition group"
            >
              <ProgressRing pct={pct} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{course.title}</h3>
                  {isComplete && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
                {course.category && <p className="text-xs text-gray-400">{course.category}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-300">
                  <span>{completedLessonsCount}/{allLessons.length} lessons</span>
                  {requiredKbIds.length > 0 && (
                    <span>• {completedReviewsCount}/{requiredKbIds.length} reviews</span>
                  )}
                  {course.estimated_duration_minutes && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {course.estimated_duration_minutes} min
                    </span>
                  )}
                  {assignment?.due_date && (
                    <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
