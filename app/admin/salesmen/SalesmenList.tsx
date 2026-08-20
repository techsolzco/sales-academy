'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startViewAsStudent } from '@/lib/actions/view-as-student'
import { Eye, User, Mail, Phone, Loader2, CheckCircle, XCircle, Shield } from 'lucide-react'

type Salesman = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  status: string | null
  created_at: string
  phone: string | null
  role?: string
}

export function SalesmenList({ salesmen }: { salesmen: Salesman[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleViewAs = async (salesman: Salesman) => {
    setLoadingId(salesman.id)
    setError(null)
    const result = await startViewAsStudent(salesman.id)
    if (result.error) {
      setError(result.error)
      setLoadingId(null)
      return
    }
    // Navigate to dashboard as this student
    router.push('/dashboard')
    router.refresh()
  }

  if (salesmen.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">No users yet</p>
        <p className="text-gray-400 text-sm mt-1">Users will appear here once they are created.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {salesmen.map(s => {
          const isAdmin = s.role === 'admin'
          return (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.full_name ?? ''} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-lg">
                    {s.full_name?.charAt(0) ?? 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col items-start gap-1">
                  <p className="font-semibold text-gray-900 truncate w-full" title={s.full_name || 'Unknown'}>{s.full_name ?? 'Unknown'}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={\	ext-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium \\}>
                      {s.status ?? 'unknown'}
                    </span>
                    <span className={\	ext-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 \\}>
                      {isAdmin && <Shield className="w-3 h-3" />}
                      {s.role || 'salesman'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm text-gray-500">
                {s.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span className="truncate" title={s.email}>{s.email}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span>{s.phone}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 pt-1 border-t border-gray-50">
                  Joined {new Date(s.created_at).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => handleViewAs(s)}
                disabled={loadingId === s.id || s.status !== 'active' || isAdmin}
                className="mt-auto flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition"
                title={isAdmin ? "Cannot view portal as admin" : ""}
              >
                {loadingId === s.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                View Portal
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
