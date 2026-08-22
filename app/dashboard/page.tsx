import { createClient } from '@/lib/supabase/server'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { StatCard } from '@/components/ui/StatCard'
import { BookOpen, CheckCircle, Clock, Star } from 'lucide-react'
import { getGreeting } from '@/lib/utils'

export default async function SalesmanDashboardPage() {
  const supabase = await createClient()
  const { userId, profile } = await getEffectiveUser()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const greeting = getGreeting()

  return (
    <div className="px-4 py-5 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Ready to level up your sales skills today?
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Assigned Courses"
          value="—"
          description="Total assigned"
          icon={<BookOpen className="w-5 h-5" />}
        />
        <StatCard
          title="Completed"
          value="—"
          description="Courses finished"
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          title="In Progress"
          value="—"
          description="Currently active"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Your Score"
          value="—"
          description="Overall performance"
          icon={<Star className="w-5 h-5" />}
        />
      </div>

      {/* Placeholder */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-400 text-sm">
          Your assigned training courses will appear here.
        </p>
      </div>
    </div>
  )
}
