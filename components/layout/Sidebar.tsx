'use client'
import { SITE_NAME } from '@/lib/config/site'

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

function SidebarNavList({
  navItems,
  footer,
  pathname,
  pendingHref,
  isPending,
  onNavClick,
  onClose,
  showCloseButton = false,
}: {
  navItems: NavItem[]
  footer?: React.ReactNode
  pathname: string
  pendingHref: string | null
  isPending: boolean
  onNavClick: (href: string) => void
  onClose?: () => void
  showCloseButton?: boolean
}) {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Logo header */}
      <div className="px-4 md:px-6 py-4 border-b border-brand-800 flex items-center justify-between bg-gradient-to-r from-brand-700/30 to-transparent flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">{SITE_NAME}</span>
        </div>
        {/* Close button — mobile only */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-brand-300 hover:text-white hover:bg-brand-700 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 md:px-3 py-3 space-y-0.5 overflow-y-auto overscroll-contain">
        {navItems.map((item) => {
          const isRootPath = item.href === '/dashboard' || item.href === '/admin'
          const isCurrentRoute = pathname === item.href || (!isRootPath && pathname.startsWith(item.href + '/'))
          const isPendingItem = pendingHref === item.href
          const isActive = isPendingItem || (isCurrentRoute && !pendingHref)
          return (
            <button
              key={item.href}
              onClick={() => onNavClick(item.href)}
              className={cn(
                // min h-11 = 44px touch target, full width, left-aligned text
                'w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                isActive
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-brand-300 hover:bg-brand-800/80 hover:text-white',
                isPendingItem && 'opacity-75'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 flex-shrink-0">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {isPendingItem && isPending && (
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer slot */}
      {footer && (
        <div className="px-2 md:px-3 py-3 border-t border-brand-800 flex-shrink-0">
          {footer}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ navItems, footer }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, setIsOpen } = useSidebar()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false)
    setPendingHref(null)
  }, [pathname, setIsOpen])

  function handleNavClick(href: string) {
    if (href === pathname) {
      setIsOpen(false)
      return
    }
    setIsOpen(false) // Close mobile sidebar immediately
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  const sidebarBackground = {
    background: 'var(--sidebar-gradient, linear-gradient(to bottom, hsl(var(--brand-800)), hsl(var(--brand-900, var(--brand-800)))))'
  }

  return (
    <>
      {/* Desktop Sidebar: strictly hidden on mobile (<md), sticky in flex container on desktop */}
      <aside
        className={cn(
          'hidden md:flex md:flex-col md:sticky top-0 left-0 z-30 h-screen w-64 flex-shrink-0',
          'border-r border-brand-700/50 sidebar-bg'
        )}
        style={sidebarBackground}
      >
        <SidebarNavList
          navItems={navItems}
          footer={footer}
          pathname={pathname}
          pendingHref={pendingHref}
          isPending={isPending}
          onNavClick={handleNavClick}
        />
      </aside>

      {/* Mobile Drawer: fixed overlay container, completely out of normal flow */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden transition-all duration-300',
          isOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        )}
      >
        {/* Backdrop overlay */}
        <div
          className={cn(
            'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <aside
          className={cn(
            'fixed top-0 left-0 bottom-0 z-50 h-full w-64 max-w-[80vw] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out sidebar-bg border-r border-brand-700/50',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          style={sidebarBackground}
        >
          <SidebarNavList
            navItems={navItems}
            footer={footer}
            pathname={pathname}
            pendingHref={pendingHref}
            isPending={isPending}
            onNavClick={handleNavClick}
            onClose={() => setIsOpen(false)}
            showCloseButton
          />
        </aside>
      </div>
    </>
  )
}

