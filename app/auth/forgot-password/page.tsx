'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { submitPasswordResetRequest } from '@/lib/actions/password-reset'
import { Key, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ email: '', full_name: '' })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) { setError('Please enter your email.'); return }
    setError(null)
    startTransition(async () => {
      const res = await submitPasswordResetRequest(form.email, form.full_name)
      if (res.error) { setError(res.error); return }
      setSubmitted(true)
    })
  }

  return (
    <div className="p-8">
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 text-brand-200 hover:text-white text-sm mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>

      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Request Password Reset</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Admin will reset your password manually</p>
            </div>
          </div>

          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Request Submitted!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">An admin will review your request and provide a temporary password. Please check back or contact your manager.</p>
              <Link href="/auth/login" className="inline-block mt-6 text-brand-600 hover:underline text-sm font-medium">← Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Name (optional)</label>
                <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Helps admin identify you" />
              </div>
              <button type="submit" disabled={isPending} className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
