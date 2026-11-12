'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Recovery-session state (B78): the page must only accept a submit when a
  // session exists. PASSWORD_RECOVERY fires for the implicit (hash) flow;
  // the PKCE flow via /auth/callback sets the session server-side, so the
  // client only ever sees INITIAL_SESSION — hence we also check getSession()
  // on mount. This proves a live session exists, not cryptographically that
  // it came from a recovery link; a normally-logged-in user landing here
  // could therefore reset their own password, which is the same power they
  // already have via Settings → Change password.
  const [hasSession, setHasSession] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  const supabase = createClient()

  // The reset link lands here with a hash fragment that Supabase processes
  // automatically to establish a one-time session.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Session is active — user can now set a new password
        setHasSession(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true)
      setSessionChecked(true)
    })

    // Unsubscribe on unmount (B78): the old listener was never cleaned up.
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Verify a recovery session exists before accepting submit (B78).
    if (!hasSession) {
      setError('This password reset link is invalid or has expired. Please request a new reset link.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    // Sign the recovery session out (B78): previously the user stayed logged
    // in and middleware bounced them straight into the portal, while the
    // copy claimed they were being sent to sign in.
    await supabase.auth.signOut()
    setDone(true)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  return (
    <div className="p-8">
      {done ? (
        <div className="text-center animate-fade-in">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Password updated!</h2>
          <p className="text-brand-200 text-sm">You&apos;ve been signed out — please sign in with your new password.</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-white mb-1">Set new password</h2>
          <p className="text-brand-200 text-sm mb-6">Choose a strong password (min 8 characters).</p>

          {sessionChecked && !hasSession && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 text-sm animate-fade-in">
              No valid password-reset session found — this link may have expired or
              already been used. Please request a new reset link.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-brand-100 mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-brand-100 mb-1.5">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              id="btn-set-password"
              className="w-full py-2.5 rounded-lg bg-white text-brand-700 font-semibold hover:bg-brand-50 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
