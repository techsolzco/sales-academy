'use client'

import { Menu } from 'lucide-react'
import { useSidebar } from './SidebarContext'

export function SidebarMobileToggle() {
  const { toggle } = useSidebar()
  
  return (
    <button
      onClick={toggle}
      className="md:hidden w-11 h-11 flex items-center justify-center -ml-1 mr-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
      aria-label="Toggle navigation menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}
