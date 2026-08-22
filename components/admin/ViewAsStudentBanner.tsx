'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { stopViewAsStudent } from '@/lib/actions/view-as-student'
import { Eye, X } from 'lucide-react'

export function ViewAsStudentBanner() {
  const router = useRouter()
  const [studentName, setStudentName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)view_as_user_name=([^;]*)/)
    if (match) {
      setStudentName(decodeURIComponent(match[1]))
    }
  }, [])

  if (!studentName) return null

  const handleExit = async () => {
    setLoading(true)
    await stopViewAsStudent()
    router.push('/admin/salesmen')
    router.refresh()
  }

  // Rendered as static flow element (not fixed/absolute) so it pushes content down
  // The parent layout wraps this + the main flex div, so it naturally reserves space
  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-sm z-40 relative">
      <div className="flex items-center gap-2 text-sm font-medium min-w-0">
        <Eye className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">
          👁️ Viewing as <strong>{studentName}</strong> — read-only preview
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={loading}
        className="ml-4 flex-shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-60"
      >
        <X className="w-3.5 h-3.5" />
        {loading ? 'Exiting...' : 'Exit Preview'}
      </button>
    </div>
  )
}
