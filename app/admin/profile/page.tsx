import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { Mail, User, ShieldCheck, KeyRound, ExternalLink } from 'lucide-react'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'

export const dynamic = 'force-dynamic'

export default async function AdminProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'A'

  return (
    <div className="px-4 py-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Settings &amp; Password
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-700 to-brand-500" />
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <AvatarUpload userId={user.id} currentAvatarUrl={profile?.avatar_url} initials={initials} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile?.full_name}</h2>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4" /> {profile?.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <ShieldCheck className="w-4 h-4" /> <span className="uppercase font-semibold text-brand-600">Admin</span>
            </div>
          </div>
        </div>
      </div>

      <ProfileEditForm initialData={{ full_name: profile?.full_name, bio: profile?.bio, phone: profile?.phone }} />

      <ChangePasswordForm />
    </div>
  )
}
