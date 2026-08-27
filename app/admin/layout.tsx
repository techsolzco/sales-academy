import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { GlobalSearchBar } from '@/components/layout/GlobalSearchBar'
import {
  LayoutDashboard, Users, BookOpen, HelpCircle, FileText, AlertCircle, Wrench, Settings, MessageSquare, UserPlus, UserCheck, BadgeCheck, Trophy, ClipboardList, Video, Paintbrush, Sparkles, Key, User, Megaphone, ScrollText, BarChart2, Trash2, Brain
} from 'lucide-react'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { DarkModeToggle } from '@/components/layout/DarkModeToggle'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { SidebarMobileToggle } from '@/components/layout/SidebarMobileToggle'
import { ToastProvider } from '@/components/ui/ToastContext'

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

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { count: pendingEnrollments } = await supabase
    .from('enrollment_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const adminNavItems = [
    { label: 'Dashboard',   href: '/admin',             icon: <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Leaderboard', href: '/admin/leaderboard', icon: <Trophy className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Users',       href: '/admin/salesmen',     icon: <Users className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Enrollments', href: '/admin/enrollments',  icon: <UserPlus className="w-4 h-4 flex-shrink-0" />, badge: pendingEnrollments || 0 },
    { label: 'Password Resets', href: '/admin/password-resets', icon: <Key className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Reseller Requests', href: '/admin/reseller-requests', icon: <UserCheck className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Resellers',   href: '/admin/resellers',    icon: <BadgeCheck className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Community',   href: '/admin/community',    icon: <MessageSquare className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Chat',        href: '/admin/chat',         icon: <MessageSquare className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Support',     href: '/admin/support',      icon: <HelpCircle className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Courses',     href: '/admin/courses',      icon: <BookOpen className="w-4 h-4 flex-shrink-0" /> },
    { label: 'FAQs',        href: '/admin/faqs',         icon: <HelpCircle className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Scripts',     href: '/admin/scripts',      icon: <FileText className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Objections',  href: '/admin/objections',   icon: <AlertCircle className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Assignments', href: '/admin/assignments',  icon: <ClipboardList className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Meetings',    href: '/admin/meetings',     icon: <Video className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Quizzes',     href: '/admin/quizzes',      icon: <BookOpen className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Tools',       href: '/admin/tools',        icon: <Wrench className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Appearance',  href: '/admin/settings/appearance', icon: <Paintbrush className="w-4 h-4 flex-shrink-0" /> },
    { label: 'AI Training', href: '/admin/settings/ai-training', icon: <Sparkles className="w-4 h-4 flex-shrink-0" /> },
    { label: 'AI Memory',   href: '/admin/settings/ai-memory',   icon: <Brain className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Settings',    href: '/admin/settings',     icon: <Settings className="w-4 h-4 flex-shrink-0" /> },
    { label: 'My Profile',  href: '/admin/profile',      icon: <User className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Policies',    href: '/admin/policies',     icon: <ScrollText className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Announcements', href: '/admin/announcements', icon: <Megaphone className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Reports', href: '/admin/reports/daily', icon: <BarChart2 className="w-4 h-4 flex-shrink-0" /> },
    { label: 'Recycle Bin', href: '/admin/settings/recycle-bin', icon: <Trash2 className="w-4 h-4 flex-shrink-0" /> },
  ]

  return (
    <LanguageProvider>
      <ToastProvider>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar
        navItems={adminNavItems}
        footer={
          <div className="space-y-1">
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-brand-400 truncate">{profile?.email}</p>
            </div>
            <SignOutButton />
          </div>
        }
      />
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden h-full">
        <header className="h-14 md:h-16 border-b border-gray-200/80 bg-white/80 dark:bg-gray-900/80 dark:border-gray-800 backdrop-blur-md px-3 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-1 md:gap-2 min-w-0">
            <SidebarMobileToggle />
            <GlobalSearchBar />
          </div>
          <div className="flex items-center gap-1.5 md:gap-4 flex-shrink-0">
            <DarkModeToggle />
            <NotificationBell userId={user.id} />
            <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 font-semibold uppercase tracking-wider">
              Admin Portal
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {children}
        </main>
      </div>
      </div>
        </SidebarProvider>
      </ToastProvider>
    </LanguageProvider>
  )
}
