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
    // Read the name from cookie (it's not httpOnly so JS can read it)
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

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="w-4 h-4 flex-shrink-0" />
        <span>
          👁️ You are viewing the student portal as <strong>{studentName}</strong> — this is a read-only preview
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={loading}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-60"
      >
        <X className="w-3.5 h-3.5" />
        {loading ? 'Exiting...' : 'Exit Preview'}
      </button>
    </div>
  )
}
