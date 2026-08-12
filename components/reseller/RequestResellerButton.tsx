'use client'

import { useState } from 'react'
import { requestResellerUpgrade } from '@/lib/actions/reseller'
import { CheckCircle2, Clock, RotateCcw, Rocket, Loader2 } from 'lucide-react'

export function RequestResellerButton({
  userId,
  qualifiesForReseller,
  currentApplication
}: {
  userId: string
  qualifiesForReseller: boolean
  currentApplication: { status: string; rejection_reason?: string } | null
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!qualifiesForReseller) return null

  const handleRequest = async () => {
    setLoading(true)
    try {
      await requestResellerUpgrade()
      setSuccess(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (success || currentApplication?.status === 'pending') {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 animate-pulse">
        <Clock className="w-5 h-5" />
        <span className="text-sm font-medium">⏳ Reseller application under review</span>
      </div>
    )
  }

  if (currentApplication?.status === 'approved') {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">✅ Sales Partner</span>
      </div>
    )
  }

  if (currentApplication?.status === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
          <p className="font-semibold mb-1">Application Rejected</p>
          <p>{currentApplication.rejection_reason || 'Please contact support for more details.'}</p>
        </div>
        <button
          onClick={handleRequest}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Reapply
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gradient-to-br from-brand-50 to-white rounded-xl border border-brand-100 shadow-sm space-y-3">
      <p className="text-sm text-gray-600 font-medium">You've completed a qualifying course!</p>
      <button
        onClick={handleRequest}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl text-sm font-semibold hover:from-brand-700 hover:to-brand-600 transition shadow-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
        🚀 Apply to become a Sales Partner
      </button>
    </div>
  )
}
