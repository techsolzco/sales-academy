import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { GlobalSearchBar } from '@/components/layout/GlobalSearchBar'
import {
  LayoutDashboard, Users, BookOpen, HelpCircle, FileText, Mic, AlertCircle, Wrench, Settings, MessageSquare, UserPlus, UserCheck, BadgeCheck, Trophy, ClipboardList, Video, Paintbrush, Sparkles
} from 'lucide-react'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { DarkModeToggle } from '@/components/layout/DarkModeToggle'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { SidebarMobileToggle } from '@/components/layout/SidebarMobileToggle'

const adminNavItems = [
  { label: 'Dashboard',   href: '/admin',             icon: <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Leaderboard', href: '/admin/leaderboard', icon: <Trophy className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Salesmen',    href: '/admin/salesmen',     icon: <Users className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Enrollments', href: '/admin/enrollments',  icon: <UserPlus className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Reseller Requests', href: '/admin/reseller-requests', icon: <UserCheck className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Resellers',   href: '/admin/resellers',    icon: <BadgeCheck className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Community',   href: '/admin/community',    icon: <MessageSquare className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Chat',        href: '/admin/chat',         icon: <MessageSquare className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Support',     href: '/admin/support',      icon: <HelpCircle className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Courses',     href: '/admin/courses',      icon: <BookOpen className="w-4 h-4 flex-shrink-0" /> },
  { label: 'FAQs',        href: '/admin/faqs',         icon: <HelpCircle className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Scripts',     href: '/admin/scripts',      icon: <FileText className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Voice Notes', href: '/admin/voice-notes',  icon: <Mic className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Objections',  href: '/admin/objections',   icon: <AlertCircle className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Assignments', href: '/admin/assignments',  icon: <ClipboardList className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Meetings',    href: '/admin/meetings',     icon: <Video className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Quizzes',     href: '/admin/quizzes',      icon: <BookOpen className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Tools',       href: '/admin/tools',        icon: <Wrench className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Appearance',  href: '/admin/settings/appearance', icon: <Paintbrush className="w-4 h-4 flex-shrink-0" /> },
  { label: 'AI Training', href: '/admin/settings/ai-training', icon: <Sparkles className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Settings',    href: '/admin/settings',     icon: <Settings className="w-4 h-4 flex-shrink-0" /> },
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

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <LanguageProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-gray-50">
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
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="h-16 border-b border-gray-200/80 bg-white/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <SidebarMobileToggle />
            <GlobalSearchBar />
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <DarkModeToggle />
            <LanguageToggle />
            <NotificationBell userId={user.id} />
            <span className="text-xs px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 font-semibold uppercase tracking-wider">
              Admin Portal
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gray-50 min-h-full">
          {children}
        </main>
      </div>
      </div>
      </SidebarProvider>
    </LanguageProvider>
  )
}
