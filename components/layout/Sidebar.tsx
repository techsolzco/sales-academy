'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface SidebarProps {
  navItems: NavItem[]
  footer?: React.ReactNode
}

export function Sidebar({ navItems, footer }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-brand-900 border-r border-brand-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Sales Academy</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-300 hover:bg-brand-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
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
  )
}
