import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RoleplayClient } from './RoleplayClient'
import { fetchRoleplayScenarios, fetchMyRoleplaySessions } from '@/lib/actions/roleplay'

export default async function RoleplayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [scenariosRes, sessionsRes] = await Promise.all([
    fetchRoleplayScenarios(),
    fetchMyRoleplaySessions(),
  ])

  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mock-Customer Roleplay</h1>
        <p className="text-gray-400 text-sm mt-1">
          Practise handling difficult customers with an AI mock customer — then get scored on it.
        </p>
      </div>

      {scenariosRes.error || sessionsRes.error ? (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-xl">
          {scenariosRes.error || sessionsRes.error}
        </div>
      ) : (
        <RoleplayClient
          initialScenarios={scenariosRes.data!}
          initialSessions={sessionsRes.data!}
        />
      )}
    </div>
  )
}
