import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/StatCard'
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Admin'} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Here&apos;s what&apos;s happening across your academy today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Salesmen"
          value="—"
          description="Active learners"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Published Courses"
          value="—"
          description="Available to team"
          icon={<BookOpen className="w-5 h-5" />}
        />
        <StatCard
          title="Completion Rate"
          value="—"
          description="Last 30 days"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Certifications"
          value="—"
          description="This month"
          icon={<Award className="w-5 h-5" />}
        />
      </div>

      {/* Placeholder content area */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-400 text-sm">
          Content panels will appear here in the next phase.
        </p>
      </div>
    </div>
  )
}
