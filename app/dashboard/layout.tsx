import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/Sidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { GlobalSearchBar } from '@/components/layout/GlobalSearchBar'
import {
  LayoutDashboard, GraduationCap, HelpCircle, FileText, Mic, AlertCircle, Wrench, User, MessageSquare, BadgeCheck, Trophy, ClipboardList, Video, Sparkles, Megaphone, ScrollText
} from 'lucide-react'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { DarkModeToggle } from '@/components/layout/DarkModeToggle'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { SidebarMobileToggle } from '@/components/layout/SidebarMobileToggle'
import { ToastProvider } from '@/components/ui/ToastContext'
import { TranslatorFab } from '@/components/ui/TranslatorFab'
import { ViewAsStudentBanner } from '@/components/admin/ViewAsStudentBanner'

const salesmanNavItems = [
  { label: 'Dashboard',   href: '/dashboard',            icon: <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Ask AI',      href: '/dashboard/ai-help',    icon: <Sparkles className="w-4 h-4 flex-shrink-0" /> },
  { label: 'English Practice', href: '/dashboard/english-practice', icon: <GraduationCap className="w-4 h-4 flex-shrink-0" /> },
  { label: 'My Training', href: '/dashboard/training',   icon: <GraduationCap className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Leaderboard', href: '/dashboard/leaderboard',icon: <Trophy className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Community',   href: '/dashboard/community',  icon: <MessageSquare className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Chat',        href: '/dashboard/chat',       icon: <MessageSquare className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Support',     href: '/dashboard/support',    icon: <HelpCircle className="w-4 h-4 flex-shrink-0" /> },
  { label: 'FAQs',        href: '/dashboard/faqs',       icon: <HelpCircle className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Scripts',     href: '/dashboard/scripts',    icon: <FileText className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Voice Notes', href: '/dashboard/voice-notes',icon: <Mic className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Objections',  href: '/dashboard/objections', icon: <AlertCircle className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Assignments', href: '/dashboard/assignments', icon: <ClipboardList className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Meetings',    href: '/dashboard/meetings',   icon: <Video className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Tools',       href: '/dashboard/tools',      icon: <Wrench className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Policies',       href: '/dashboard/policies',       icon: <ScrollText className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Announcements',  href: '/dashboard/announcements',  icon: <Megaphone className="w-4 h-4 flex-shrink-0" /> },
  { label: 'Profile',        href: '/dashboard/profile',        icon: <User className="w-4 h-4 flex-shrink-0" /> },
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

  const { data: realProfile } = await supabase
    .from('profiles')
    .select('role, full_name, email, is_reseller')
    .eq('id', user.id)
    .single()

  // Check for admin "view as student" impersonation cookie
  const cookieStore = await cookies()
  const viewAsUserId = cookieStore.get('view_as_user_id')?.value
  const isImpersonating = realProfile?.role === 'admin' && !!viewAsUserId

  // If admin and NOT impersonating → redirect to admin panel
  if (realProfile?.role === 'admin' && !isImpersonating) {
    redirect('/admin')
  }
  // If neither admin nor salesman → go to login
  if (realProfile?.role !== 'admin' && realProfile?.role !== 'salesman') {
    redirect('/auth/login')
  }

  // Determine which profile to display (target student or self)
  let profile = realProfile
  let displayUserId = user.id

  if (isImpersonating && viewAsUserId) {
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: studentProfile } = await sb
      .from('profiles')
      .select('role, full_name, email, is_reseller')
      .eq('id', viewAsUserId)
      .single()
    if (studentProfile) {
      profile = studentProfile
      displayUserId = viewAsUserId
    }
  }

  const { data: notifCounts } = await supabase
    .from('notifications')
    .select('type')
    .eq('user_id', displayUserId)
    .eq('read', false)


  const countByType = (type: string) => notifCounts?.filter(n => n.type === type).length ?? 0

  const navItems = [
    ...salesmanNavItems.map(item => {
      if (item.label === 'Assignments') return { ...item, badge: countByType('assignment') > 0 ? countByType('assignment') : (countByType('badge') > 0 ? countByType('badge') : undefined) }
      if (item.label === 'Community') return { ...item, badge: countByType('community') > 0 ? countByType('community') : undefined }
      return item
    }),
    ...(profile?.is_reseller ? [{ label: 'Sales Partner', href: '/dashboard/reseller', icon: <BadgeCheck className="w-4 h-4 flex-shrink-0" /> }] : [])
  ]

  return (
    <LanguageProvider>
      <ToastProvider>
        <SidebarProvider>
          {isImpersonating && <ViewAsStudentBanner />}
          <div className={`flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${isImpersonating ? 'pt-10' : ''}`}>
      <Sidebar
        navItems={navItems}
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
            <NotificationBell userId={displayUserId} />
            {isImpersonating ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold uppercase tracking-wider">
                Preview Mode
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wider">
                Sales Portal
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <WhatsAppButton />
      <TranslatorFab />
      </div>
        </SidebarProvider>
      </ToastProvider>
    </LanguageProvider>
  )
}
