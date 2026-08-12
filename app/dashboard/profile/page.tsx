import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { BadgeGrid } from '@/components/profile/BadgeGrid'
import { fetchUserBadges } from '@/lib/actions/badges'
import { User, Mail, Briefcase, ExternalLink } from 'lucide-react'
import { RequestResellerButton } from '@/components/reseller/RequestResellerButton'
import { fetchMyResellerApplication } from '@/lib/actions/reseller'
import Link from 'next/link'

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
  const resellerApp = await fetchMyResellerApplication()

  const { data: qualifyingCourses } = await supabase
    .from('courses')
    .select('id, name, qualifying_for_reseller, modules(lessons(lesson_progress(user_id, completed)))')
    .eq('qualifying_for_reseller', true)
    
  const qualifiesForReseller = qualifyingCourses?.some((course: any) => {
    const allLessons = course.modules?.flatMap((m: any) => m.lessons ?? []) ?? []
    return allLessons.length > 0 && allLessons.every((l: any) => 
      l.lesson_progress?.some((p: any) => p.user_id === user.id && p.completed)
    )
  }) ?? false

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
            
            <div className="mt-6">
              {profile?.is_reseller ? (
                <div className="p-5 bg-gradient-to-r from-brand-50 to-white rounded-xl border border-brand-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">✅ Sales Partner</h3>
                    <p className="text-sm text-gray-600 mt-1">You have access to the partner program.</p>
                  </div>
                  {profile.sales_portal_url ? (
                    <a 
                      href={profile.sales_portal_url} 
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition"
                    >
                      Sales Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      Portal URL Pending
                    </span>
                  )}
                </div>
              ) : (
                <RequestResellerButton 
                  userId={user.id} 
                  qualifiesForReseller={qualifiesForReseller} 
                  currentApplication={resellerApp} 
                />
              )}
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
