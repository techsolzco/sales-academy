import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { LayoutDashboard, Users, BookOpen, Settings } from 'lucide-react'

const adminNavItems = [
  { label: 'Dashboard',  href: '/admin',          icon: LayoutDashboard },
  { label: 'Salesmen',   href: '/admin/salesmen',  icon: Users },
  { label: 'Courses',    href: '/admin/courses',   icon: BookOpen },
  { label: 'Settings',   href: '/admin/settings',  icon: Settings },
]

export default async function AdminLayout({
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

  // Double-check role at the layout level (middleware is the first line of defence)
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        navItems={adminNavItems}
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
