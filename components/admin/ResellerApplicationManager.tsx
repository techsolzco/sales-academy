'use client'

import { useState } from 'react'
import { ResellerApplication, approveResellerApplication, rejectResellerApplication } from '@/lib/actions/reseller'
import { Check, X, Link as LinkIcon } from 'lucide-react'

export function ResellerApplicationManager({
  initialApplications
}: {
  initialApplications: ResellerApplication[]
}) {
  const [applications, setApplications] = useState(initialApplications)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [rejectReason, setRejectReason] = useState('')
  const [salesUrl, setSalesUrl] = useState('')
  const [showRejectInputFor, setShowRejectInputFor] = useState<string | null>(null)
  const [showApproveInputFor, setShowApproveInputFor] = useState<string | null>(null)

  const filtered = applications.filter(a => filter === 'all' || a.status === filter)

  const handleApprove = async (id: string) => {
    await approveResellerApplication(id, salesUrl || undefined)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a))
    setShowApproveInputFor(null)
    setSalesUrl('')
  }

  const handleReject = async (id: string) => {
    if (!rejectReason) return
    await rejectResellerApplication(id, rejectReason)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', rejection_reason: rejectReason } : a))
    setShowRejectInputFor(null)
    setRejectReason('')
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === f ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                  {app.profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{app.profile?.full_name || 'Unknown User'}</h4>
                  <p className="text-xs text-gray-500">{app.profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${app.status === 'approved' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {app.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {app.status === 'pending' && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-3">
                {showApproveInputFor === app.id ? (
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="url" 
                        value={salesUrl} 
                        onChange={e => setSalesUrl(e.target.value)} 
                        placeholder="Sales Portal URL (optional)" 
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-green-500" 
                      />
                    </div>
                    <button onClick={() => handleApprove(app.id)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Confirm Approve</button>
                    <button onClick={() => setShowApproveInputFor(null)} className="text-gray-500 text-sm hover:text-gray-700 px-2">Cancel</button>
                  </div>
                ) : showRejectInputFor === app.id ? (
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={rejectReason} 
                      onChange={e => setRejectReason(e.target.value)} 
                      placeholder="Reason for rejection..." 
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-red-500" 
                    />
                    <button onClick={() => handleReject(app.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Submit Reject</button>
                    <button onClick={() => setShowRejectInputFor(null)} className="text-gray-500 text-sm hover:text-gray-700 px-2">Cancel</button>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowRejectInputFor(app.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 text-sm font-medium transition">
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => setShowApproveInputFor(app.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-green-600 bg-green-50 hover:bg-green-100 text-sm font-medium transition">
                      <Check className="w-4 h-4" /> Approve
                    </button>
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
