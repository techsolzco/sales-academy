'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approvePasswordReset, rejectPasswordReset } from '@/lib/actions/password-reset'
import type { PasswordResetRequest } from '@/lib/actions/password-reset'
import { Check, X, Loader2, Key, Clock, AlertCircle } from 'lucide-react'

export function PasswordResetManager({ initialRequests }: { initialRequests: PasswordResetRequest[] }) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [isPending, startTransition] = useTransition()
  const [approvedResult, setApprovedResult] = useState<{ id: string; tempPassword: string } | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  function handleApprove(id: string) {
    setProcessingId(id)
    startTransition(async () => {
      const res = await approvePasswordReset(id)
      if (res.error) { alert(res.error); setProcessingId(null); return }
      setApprovedResult({ id, tempPassword: (res.data as any).tempPassword })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
      setProcessingId(null)
      router.refresh()
    })
  }

  function handleReject(id: string) {
    const note = prompt('Rejection reason (optional):')
    setProcessingId(id)
    startTransition(async () => {
      await rejectPasswordReset(id, note || undefined)
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r))
      setProcessingId(null)
      router.refresh()
    })
  }

  const pending = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6">
      {approvedResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
          <p className="text-emerald-800 dark:text-emerald-300 font-semibold text-sm">✓ Password reset approved!</p>
          <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-1">Temporary password: <code className="font-mono bg-emerald-100 dark:bg-emerald-800 px-2 py-0.5 rounded">{approvedResult.tempPassword}</code></p>
          <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-1">Share this securely with the user. They should change it immediately after logging in.</p>
          <button onClick={() => setApprovedResult(null)} className="text-xs text-emerald-600 mt-2 hover:underline">Dismiss</button>
        </div>
      )}

      {pending.length === 0 && resolved.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No password reset requests yet.</p>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700/50 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{r.full_name || '(Name not provided)'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{r.email}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {processingId === r.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                  ) : (
                    <>
                      <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleReject(r.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Resolved</h2>
          <div className="space-y-2">
            {resolved.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{r.full_name || r.email}</p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
