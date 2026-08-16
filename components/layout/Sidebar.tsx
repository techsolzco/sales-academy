'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSidebar } from './SidebarContext'
import { useEffect, useTransition, useState } from 'react'
import { X } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

interface SidebarProps {
  navItems: NavItem[]
  footer?: React.ReactNode
}

export function Sidebar({ navItems, footer }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, setIsOpen } = useSidebar()
  const [isPending, startTransition] = useTransition()
  // Track which href was clicked for instant visual feedback
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Close sidebar on route change + clear pending state
  useEffect(() => {
    setIsOpen(false)
    setPendingHref(null)
  }, [pathname, setIsOpen])

  function handleNavClick(href: string) {
    if (href === pathname) return
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-brand-900 border-r border-brand-800 flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Sales Academy</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="md:hidden text-brand-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          // Show as active if it's the current page OR if it's been clicked and pending
          const isCurrentRoute = pathname === item.href || pathname.startsWith(item.href + '/')
          const isPendingItem = pendingHref === item.href
          const isActive = isPendingItem || (isCurrentRoute && !pendingHref)
          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                isActive
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-300 hover:bg-brand-800 hover:text-white',
                isPendingItem && 'opacity-80'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {isPendingItem && isPending && (
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer slot (sign out, profile, etc.) */}
      {footer && (
        <div className="px-3 py-4 border-t border-brand-800">
          {footer}
        </div>
      )}
    </aside>
    </>
  )
}
