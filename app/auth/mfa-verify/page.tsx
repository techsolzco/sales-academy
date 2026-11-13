'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShieldCheck, AlertCircle, LogOut } from 'lucide-react'

/**
 * MFA verify step (function #19 — Admin two-factor authentication).
 *
 * Reached after a password sign-in when the user has an enrolled verified
 * TOTP factor but the session is still password-only (aal1). The user enters
 * the 6-digit code from their authenticator app; on success the session is
 * upgraded to aal2 and they continue to their original destination.
 *
 * NEVER loops:
 * - If the session is already aal2, or no verified factor exists, the page
 *   redirects away immediately (after a best-effort session refresh, so the
 *   middleware sees fresh factor state and cannot bounce the user back here).
 * - If there is no session at all, the user is sent to /auth/login.
 * - The `next` destination is validated the same way as the login page
 *   (B18): same-origin relative paths only, protocol-relative rejected.
 */
function MfaVerifyForm() {
  const searchParams = useSearchParams()

  // Open-redirect guard (B18), mirroring app/auth/login/page.tsx.
  const rawNext = searchParams.get('next')
  const validNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null

  const supabase = createClient()

  const [status, setStatus] = useState<'checking' | 'ready' | 'failed'>('checking')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const initRef = useRef(false)

  // Resolve the post-verification destination: the validated `next` param,
  // otherwise the role-based default (same rule as the login page).
  async function resolveDestination(): Promise<string> {
    if (validNext) return validNext
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return '/dashboard'
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    return profile?.role === 'admin' ? '/admin' : '/dashboard'
  }

  // Leave this page. A session refresh first makes sure the middleware sees
  // the current factor/AAL state (e.g. a factor unenrolled elsewhere) instead
  // of stale session data — without it, a stale aal1+factor session could be
  // bounced back here forever. Hard navigation guarantees fresh SSR and
  // updated cookies, matching the login page.
  async function redirectAway() {
    try {
      await supabase.auth.refreshSession()
    } catch {
      // Best-effort only; the redirect itself is what matters.
    }
    window.location.href = await resolveDestination()
  }

  async function createChallenge(id: string): Promise<string | null> {
    const { data, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: id,
    })
    if (challengeError || !data?.id) {
      setError('Could not start verification. Please try again or sign in again.')
      setStatus('failed')
      return null
    }
    setChallengeId(data.id)
    return data.id
  }

  useEffect(() => {
    // Guard against React StrictMode double-invoking the effect in dev:
    // creating two challenges is harmless, but one is enough.
    if (initRef.current) return
    initRef.current = true

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/auth/login'
        return
      }

      // Already fully verified (aal2)? Nothing to do here — leave at once.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') {
        await redirectAway()
        return
      }

      // No verified TOTP factor enrolled? There is nothing to verify — leave
      // at once (fail open; a user without MFA must never be stuck here).
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) {
        setError('Could not check your two-factor status. Please try signing in again.')
        setStatus('failed')
        return
      }
      const verifiedTotp = factors?.totp?.find((f) => f.status === 'verified') ?? null
      if (!verifiedTotp) {
        await redirectAway()
        return
      }

      setFactorId(verifiedTotp.id)
      const challenge = await createChallenge(verifiedTotp.id)
      if (challenge) setStatus('ready')
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || !challengeId || verifying) return
    const cleanCode = code.trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }

    setVerifying(true)
    setError(null)

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: cleanCode,
    })

    if (verifyError) {
      setError('Incorrect code. Please try again with the latest code from your authenticator app.')
      setCode('')
      setVerifying(false)
      // Challenges are single-use: mint a fresh one for the next attempt.
      await createChallenge(factorId)
      return
    }

    // Success — the session is now aal2. Hard-navigate to the destination.
    window.location.href = await resolveDestination()
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  if (status === 'checking') {
    return (
      <div className="p-8 sm:p-10 flex flex-col items-center gap-3 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/70" />
        <p className="text-brand-200 text-sm">Checking your verification status…</p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="p-8 sm:p-10">
        <div className="mb-7 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Verification unavailable</h2>
          <div className="w-10 h-0.5 bg-gradient-to-r from-brand-400 to-transparent mt-2 mb-3 rounded-full mx-auto" />
        </div>
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            {error}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 hover:from-brand-400 hover:to-brand-300 text-white font-semibold text-sm text-center transition-all"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 sm:p-10">
      <div className="mb-7 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 mb-4">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Two-factor verification</h2>
        <div className="w-10 h-0.5 bg-gradient-to-r from-brand-400 to-transparent mt-2 mb-3 rounded-full mx-auto" />
        <p className="text-brand-200 text-sm">
          Enter the 6-digit code from your authenticator app to finish signing in.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label htmlFor="mfa-code" className="block text-sm font-medium text-brand-100 mb-2">
            Authentication code
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-white/50 focus:bg-white/20 transition-all text-sm text-center tracking-[0.5em] font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={verifying || !challengeId}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 hover:from-brand-400 hover:to-brand-300 text-white font-semibold active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-900/40"
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying…
            </>
          ) : (
            'Verify and continue'
          )}
        </button>
      </form>

      <div className="mt-7 text-center border-t border-white/10 pt-6 space-y-2">
        <p className="text-sm text-brand-200">
          Lost access to your authenticator app?{' '}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-white hover:underline font-semibold inline-flex items-center gap-1 disabled:opacity-60"
          >
            <LogOut className="w-3.5 h-3.5" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </p>
        <p className="text-xs text-brand-300/70">
          An admin with Supabase dashboard access can remove the lost factor (Auth → Users → your
          account → Factors) so you can sign in and enrol again.
        </p>
      </div>
    </div>
  )
}

export default function MfaVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 sm:p-10 flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/70" />
          <p className="text-brand-200 text-sm">Loading…</p>
        </div>
      }
    >
      <MfaVerifyForm />
    </Suspense>
  )
}
