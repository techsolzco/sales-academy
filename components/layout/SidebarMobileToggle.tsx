'use client'

import { Menu } from 'lucide-react'
import { useSidebar } from './SidebarContext'

export function SidebarMobileToggle() {
  const { toggle } = useSidebar()
  
  return (
    <button 
      onClick={toggle}
      className="md:hidden p-2 -ml-2 mr-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label="Toggle Menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}
