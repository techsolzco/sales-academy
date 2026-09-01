'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startViewAsStudent } from '@/lib/actions/view-as-student'
import { deactivateUser, reactivateUser } from '@/lib/actions/users'
import { Eye, Loader2, Mail, Phone, User, Shield, XCircle, UserX, UserCheck, AlertTriangle } from 'lucide-react'

interface Salesman {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  status: string | null
  created_at: string
  phone: string | null
  role: string | null
}

interface Props {
  salesmen: Salesman[]
  currentUserId?: string
}

export function SalesmenList({ salesmen, currentUserId }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleViewAs = async (salesman: Salesman) => {
    setLoadingId(salesman.id)
    setError(null)
    // startViewAsStudent calls redirect() server-side — no client router.push needed
    await startViewAsStudent(salesman.id).catch(() => {})
    setLoadingId(null)
  }

  const handleDeactivate = async (id: string) => {
    setDeactivatingId(id)
    const res = await deactivateUser(id)
    if (res.error) { setError(res.error); setDeactivatingId(null); return }
    setConfirmDeactivate(null)
    setDeactivatingId(null)
    router.refresh()
  }

  const handleReactivate = async (id: string) => {
    setDeactivatingId(id)
    const res = await reactivateUser(id)
    if (res.error) { setError(res.error); setDeactivatingId(null); return }
    setDeactivatingId(null)
    router.refresh()
  }

  if (salesmen.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600 p-16 text-center">
        <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No users yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Users will appear here once they are created.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {salesmen.map(s => {
          const isAdmin = s.role === 'admin'
          const isActive = s.status === 'active'
          const isSelf = s.id === currentUserId
          const isDeactivateConfirming = confirmDeactivate === s.id
          const isProcessing = deactivatingId === s.id

          return (
            <div key={s.id} className={"bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 sm:p-5 flex flex-col gap-4 " +
              (isActive ? "border-gray-100 dark:border-gray-700" : "border-red-100 dark:border-red-900/40 opacity-80")}>

              {/* Header */}
              <div className="flex items-center gap-3">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.full_name ?? ""} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg">
                    {s.full_name?.charAt(0) ?? "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col items-start gap-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate w-full" title={s.full_name || "Unknown"}>
                    {s.full_name ?? "Unknown"}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={"text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium " +
                      (isActive ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400")}>
                      {s.status ?? "unknown"}
                    </span>
                    <span className={"text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 " +
                      (isAdmin ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                               : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400")}>
                      {isAdmin && <Shield className="w-3 h-3" />}
                      {s.role || "salesman"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                {s.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    <span className="truncate" title={s.email}>{s.email}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    <span>{s.phone}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-700">
                  Joined {new Date(s.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                </p>
              </div>

              {/* Inline confirm deactivate */}
              {isDeactivateConfirming && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Deactivate <strong>{s.full_name}</strong>? They will be blocked from logging in.</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeactivate(s.id)} disabled={isProcessing}
                      className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-1">
                      {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                      Yes, deactivate
                    </button>
                    <button onClick={() => setConfirmDeactivate(null)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-auto flex gap-2">
                {!isAdmin && isActive && (
                  <button onClick={() => handleViewAs(s)} disabled={loadingId === s.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                    {loadingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    View Portal
                  </button>
                )}
                {!isAdmin && !isSelf && isActive && !isDeactivateConfirming && (
                  <button onClick={() => setConfirmDeactivate(s.id)} title="Deactivate user"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition border border-red-100 dark:border-red-800">
                    <UserX className="w-4 h-4" />
                  </button>
                )}
                {!isAdmin && !isActive && (
                  <button onClick={() => handleReactivate(s.id)} disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
