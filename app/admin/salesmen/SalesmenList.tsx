'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startViewAsStudent } from '@/lib/actions/view-as-student'
import { deactivateUser, reactivateUser, deleteUserPermanently, getUserActivityCount } from '@/lib/actions/users'
import {
  Eye, Loader2, Mail, Phone, User, Shield, XCircle,
  UserX, UserCheck, AlertTriangle, Trash2, X
} from 'lucide-react'

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

interface DeleteTarget {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

interface ActivityCounts {
  quizAttempts: number
  assignmentSubmissions: number
}

export function SalesmenList({ salesmen, currentUserId }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleteActivity, setDeleteActivity] = useState<ActivityCounts | null>(null)
  const [deleteActivityLoading, setDeleteActivityLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleting] = useTransition()

  const handleViewAs = async (salesman: Salesman) => {
    setLoadingId(salesman.id)
    setError(null)
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

  const openDeleteModal = async (s: Salesman) => {
    setDeleteTarget({ id: s.id, full_name: s.full_name, email: s.email, role: s.role })
    setDeleteConfirmEmail('')
    setDeleteError(null)
    setDeleteActivity(null)
    setDeleteActivityLoading(true)
    const counts = await getUserActivityCount(s.id)
    setDeleteActivity({ quizAttempts: counts.quizAttempts, assignmentSubmissions: counts.assignmentSubmissions })
    setDeleteActivityLoading(false)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setDeleteConfirmEmail('')
    setDeleteError(null)
    setDeleteActivity(null)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setDeleteError(null)
    startDeleting(async () => {
      const res = await deleteUserPermanently(deleteTarget.id)
      if (res.error) { setDeleteError(res.error); return }
      closeDeleteModal()
      router.refresh()
    })
  }

  const emailMatches = deleteConfirmEmail.trim().toLowerCase() === (deleteTarget?.email ?? '').toLowerCase()
  const hasActivity = (deleteActivity?.quizAttempts ?? 0) + (deleteActivity?.assignmentSubmissions ?? 0) > 0

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
    <>
      {/* ─── List ─────────────────────────────────────────────────────────── */}
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

                {/* Inline deactivate confirm */}
                {isDeactivateConfirming && (
                  <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 text-sm text-orange-700 dark:text-orange-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Deactivate <strong>{s.full_name}</strong>? They will be blocked from logging in.</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeactivate(s.id)} disabled={isProcessing}
                        className="flex-1 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-1">
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
                  {/* View Portal */}
                  {!isAdmin && isActive && (
                    <button onClick={() => handleViewAs(s)} disabled={loadingId === s.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                      {loadingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      View Portal
                    </button>
                  )}

                  {/* Deactivate (active, non-admin, non-self) */}
                  {!isAdmin && !isSelf && isActive && !isDeactivateConfirming && (
                    <button onClick={() => setConfirmDeactivate(s.id)} title="Deactivate (keeps data)"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition border border-orange-100 dark:border-orange-800">
                      <UserX className="w-4 h-4" />
                    </button>
                  )}

                  {/* Reactivate (inactive) */}
                  {!isAdmin && !isActive && (
                    <button onClick={() => handleReactivate(s.id)} disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                      Reactivate
                    </button>
                  )}

                  {/* Permanent delete — shown for all non-self users */}
                  {!isSelf && (
                    <button onClick={() => openDeleteModal(s)} title="Permanently delete account"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition border border-red-100 dark:border-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Delete Modal ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={closeDeleteModal} />

          {/* Dialog */}
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Delete Account Permanently</h2>
              </div>
              <button onClick={closeDeleteModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* User info */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{deleteTarget.full_name ?? 'Unknown'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{deleteTarget.email}</p>
              </div>

              {/* Activity warning */}
              {deleteActivityLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking activity history…
                </div>
              ) : hasActivity ? (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
                  <div className="flex items-start gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    This user has activity that will be permanently erased:
                  </div>
                  <ul className="ml-6 text-sm text-amber-700 dark:text-amber-400 space-y-0.5 list-disc">
                    {(deleteActivity?.quizAttempts ?? 0) > 0 && (
                      <li>{deleteActivity!.quizAttempts} quiz attempt{deleteActivity!.quizAttempts !== 1 ? 's' : ''}</li>
                    )}
                    {(deleteActivity?.assignmentSubmissions ?? 0) > 0 && (
                      <li>{deleteActivity!.assignmentSubmissions} assignment submission{deleteActivity!.assignmentSubmissions !== 1 ? 's' : ''}</li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 text-sm text-gray-500 dark:text-gray-400">
                  ✓ No quiz attempts or assignment submissions found.
                </div>
              )}

              {/* Warning */}
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                <strong>This cannot be undone.</strong> The account, login credentials, and all associated data will be permanently removed from the system.
              </div>

              {/* Type-to-confirm */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs text-red-600 dark:text-red-400 font-mono">{deleteTarget.email}</code> to confirm
                </label>
                <input
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={e => setDeleteConfirmEmail(e.target.value)}
                  placeholder={deleteTarget.email ?? ''}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  autoComplete="off"
                />
              </div>

              {/* Error */}
              {deleteError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {deleteError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button onClick={closeDeleteModal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!emailMatches || isDeleting || deleteActivityLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Trash2 className="w-4 h-4" />
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
