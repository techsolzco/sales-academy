'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { approveApplication, rejectApplication } from '@/lib/actions/enrollment'
import { Check, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface Application {
  id: string
  full_name: string
  email: string
  phone: string
  knowledge_level: string
  desired_course: string
  reason: string
  prior_experience: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export function EnrollmentManager({ initialApplications }: { initialApplications: Application[] }) {
  const [applications, setApplications] = useState(initialApplications)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInputFor, setShowRejectInputFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('enrollments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollment_applications' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setApplications(prev => [payload.new as Application, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setApplications(prev => prev.map(a => a.id === payload.new.id ? payload.new as Application : a))
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = applications.filter(a => filter === 'all' || a.status === filter)

  const handleApprove = async (id: string) => {
    startTransition(async () => {
      const result = await approveApplication(id)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        router.refresh()
      }
    })
  }

  const handleReject = async (id: string) => {
    if (!rejectReason) return
    startTransition(async () => {
      const result = await rejectApplication(id, rejectReason)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setShowRejectInputFor(null)
        setRejectReason('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === f ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map(app => (
          <div key={app.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                  {app.full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{app.full_name}</h4>
                  <p className="text-xs text-gray-500">{app.email} • {app.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${app.status === 'approved' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {app.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString()}</span>
                {expandedId === app.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {expandedId === app.id && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase">Knowledge Level</h5>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 capitalize">{app.knowledge_level}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase">Desired Course</h5>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{app.desired_course}</p>
                  </div>
                  <div className="col-span-2">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase">Reason</h5>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{app.reason}</p>
                  </div>
                  <div className="col-span-2">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase">Prior Experience</h5>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{app.prior_experience}</p>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    {showRejectInputFor === app.id ? (
                      <div className="flex gap-2 items-center flex-1">
                        <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-red-500" />
                        <button onClick={() => handleReject(app.id)} disabled={isPending} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5">
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Submit
                        </button>
                        <button onClick={() => setShowRejectInputFor(null)} className="text-gray-500 text-sm hover:text-gray-700 px-2">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setShowRejectInputFor(app.id)} disabled={isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 text-sm font-medium transition disabled:opacity-50">
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button onClick={() => handleApprove(app.id)} disabled={isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-green-600 bg-green-50 hover:bg-green-100 text-sm font-medium transition disabled:opacity-50">
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No applications found.</div>}
      </div>
    </div>
  )
}
