import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { BadgeGrid } from '@/components/profile/BadgeGrid'
import { fetchUserBadges } from '@/lib/actions/badges'
import { User, Mail, Briefcase } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userBadges = await fetchUserBadges(user.id)

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-32 bg-brand-600"></div>
        <div className="px-8 pb-8">
          <div className="-mt-12 mb-4">
            <AvatarUpload userId={user.id} currentAvatarUrl={profile?.avatar_url} initials={initials} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h1>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" /> {profile?.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4" /> {profile?.department || 'Sales Department'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" /> Role: <span className="uppercase font-semibold text-brand-600">{profile?.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Badges</h2>
        <BadgeGrid badges={userBadges || []} />
      </div>
    </div>
  )
}
