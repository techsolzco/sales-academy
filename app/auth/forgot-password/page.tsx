'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError('Something went wrong. Please try again.')
      return
    }

    setSent(true)
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

      {sent ? (
        <div className="text-center animate-fade-in">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
          <p className="text-brand-200 text-sm">
            We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>.
            It will expire in 1 hour.
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-white mb-1">Reset your password</h2>
          <p className="text-brand-200 text-sm mb-6">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-brand-100 mb-1.5">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              id="btn-reset-password"
              className="w-full py-2.5 rounded-lg bg-white text-brand-700 font-semibold hover:bg-brand-50 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
