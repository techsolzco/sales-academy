'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Sparkles, GraduationCap, Trophy, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'

const TABS = [
  { label: 'Home',     href: '/dashboard',             icon: LayoutDashboard },
  { label: 'Ask AI',   href: '/dashboard/ai-help',     icon: Sparkles },
  { label: 'Training', href: '/dashboard/training',    icon: GraduationCap },
  { label: 'Rankings', href: '/dashboard/leaderboard', icon: Trophy },
  { label: 'Chat',     href: '/dashboard/chat',        icon: MessageSquare },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors',
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
