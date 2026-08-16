'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Mode = 'light' | 'dark' | 'system'

export function DarkModeToggle() {
  const [mode, setMode] = useState<Mode>('system')

  useEffect(() => {
    const saved = (localStorage.getItem('darkMode') as Mode) || 'system'
    setMode(saved)
    applyMode(saved)
  }, [])

  function applyMode(m: Mode) {
    const isDark =
      m === 'dark' ||
      (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }

  function cycle() {
    const next: Mode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
    setMode(next)
    localStorage.setItem('darkMode', next)
    applyMode(next)
  }

  const icon = mode === 'light' ? <Sun className="w-4 h-4" /> : mode === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />
  const label = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'

  return (
    <button
      onClick={cycle}
      title={`Theme: ${label}. Click to cycle.`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
    >
      {icon}
      <span className="hidden sm:inline text-xs">{label}</span>
    </button>
  )
}
