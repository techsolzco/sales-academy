import { createClient } from '@/lib/supabase/server'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, department, joining_date, avatar_url')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
      <p className="text-gray-400 text-sm">Your account details.</p>

      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg">
            {profile?.full_name?.[0] ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile?.full_name}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          {profile?.department && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Department</span>
              <span className="text-gray-700 font-medium">{profile.department}</span>
            </div>
          )}
          {profile?.joining_date && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Joined</span>
              <span className="text-gray-700 font-medium">
                {new Date(profile.joining_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
