import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { LayoutDashboard, GraduationCap, User } from 'lucide-react'

const salesmanNavItems = [
  { label: 'Dashboard',    href: '/dashboard',          icon: LayoutDashboard },
  { label: 'My Training',  href: '/dashboard/training', icon: GraduationCap },
  { label: 'Profile',      href: '/dashboard/profile',  icon: User },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  // Defense-in-depth: verify role at the layout level too
  if (profile?.role !== 'salesman') {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        navItems={salesmanNavItems}
        footer={
          <div className="space-y-1">
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-brand-400 truncate">{profile.email}</p>
            </div>
            <SignOutButton />
          </div>
        }
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
