'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
} from 'lucide-react'

/**
 * Two-factor authentication setup (audit §3 #19 — Admin 2FA via Supabase MFA).
 *
 * Admin-only: rendered on the admin settings page (/admin/settings), which
 * the admin layout already gates to admins. Enrols a TOTP factor for the
 * signed-in admin's own account — no QR library is used: the secret and
 * the otpauth:// URI are shown as copyable text to paste into any
 * authenticator app.
 *
 * Flow: listFactors → enrol({ factorType: 'totp' }) → challenge →
 * verify(code) to confirm. Unenrol is a two-step confirm. A factor left
 * in 'unverified' state (setup abandoned halfway) must be discarded
 * before a fresh enrol, because its secret was only shown once.
 *
 * Recovery: if the admin loses the authenticator app, anyone with
 * Supabase dashboard access can remove the factor (Auth → Users → the
 * account → Factors → delete). Login is never blocked for accounts
 * without an enrolled factor — the login page and middleware only
 * redirect to /auth/mfa-verify when a verified factor exists.
 */

interface VerifiedFactor {
  id: string
  created_at: string
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-secure context) — the text is
      // still selectable in the read-only field below.
      setCopied(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <input
        type="text"
        readOnly
        value={value}
        onFocus={(e) => e.target.select()}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono break-all"
      />
    </div>
  )
}

export function MfaSetup() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [verifiedFactor, setVerifiedFactor] = useState<VerifiedFactor | null>(null)
  const [unverifiedFactorId, setUnverifiedFactorId] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState<{ factorId: string; secret: string; uri: string } | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmUnenroll, setConfirmUnenroll] = useState(false)
  const mountedRef = useRef(true)

  const loadFactors = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: listError } = await supabase.auth.mfa.listFactors()
    if (!mountedRef.current) return
    if (listError) {
      setError('Could not check your two-factor status. Please reload the page and try again.')
      setLoading(false)
      return
    }
    // NOTE: data.totp is typed as verified-only factors (supabase-js
    // types listFactors' per-type arrays as Factor<K, 'verified'>), so
    // the unverified factor is only visible in data.all.
    const allTotp = (data?.all ?? []).filter((f) => f.factor_type === 'totp')
    const verified = allTotp.find((f) => f.status === 'verified') ?? null
    const unverified = allTotp.find((f) => f.status === 'unverified') ?? null
    setVerifiedFactor(verified ? { id: verified.id, created_at: verified.created_at } : null)
    setUnverifiedFactorId(unverified ? unverified.id : null)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    mountedRef.current = true
    loadFactors()
    return () => {
      mountedRef.current = false
    }
  }, [loadFactors])

  async function createChallenge(factorId: string): Promise<string | null> {
    const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !data?.id) {
      setError('Could not start verification. Please try again.')
      return null
    }
    setChallengeId(data.id)
    return data.id
  }

  async function handleStartEnroll() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Academy Admin',
    })
    if (enrollError || !data?.id || !data?.totp?.secret || !data?.totp?.uri) {
      setError(
        enrollError?.message ||
          'Could not start two-factor setup. Please try again.'
      )
      setBusy(false)
      return
    }
    setEnrolling({ factorId: data.id, secret: data.totp.secret, uri: data.totp.uri })
    setUnverifiedFactorId(data.id)
    await createChallenge(data.id)
    setBusy(false)
  }

  async function handleDiscardUnverified() {
    if (!unverifiedFactorId) return
    setBusy(true)
    setError(null)
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: unverifiedFactorId,
    })
    if (unenrollError) {
      setError(`Could not discard the incomplete setup: ${unenrollError.message}`)
      setBusy(false)
      return
    }
    setUnverifiedFactorId(null)
    setEnrolling(null)
    setChallengeId(null)
    setCode('')
    setSuccess('Incomplete setup discarded. You can start again below.')
    setBusy(false)
  }

  async function handleCancelEnroll() {
    // Discard the just-created unverified factor so it does not linger.
    await handleDiscardUnverified()
    setSuccess(null)
  }

  async function handleConfirmEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!enrolling || busy) return
    const cleanCode = code.trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }

    setBusy(true)
    setError(null)

    let activeChallengeId = challengeId
    if (!activeChallengeId) {
      activeChallengeId = await createChallenge(enrolling.factorId)
      if (!activeChallengeId) {
        setBusy(false)
        return
      }
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: activeChallengeId,
      code: cleanCode,
    })

    if (verifyError) {
      setError('Incorrect code. Please try again with the latest code from your authenticator app.')
      setCode('')
      setBusy(false)
      // Challenges are single-use: mint a fresh one for the next attempt.
      await createChallenge(enrolling.factorId)
      return
    }

    setEnrolling(null)
    setChallengeId(null)
    setCode('')
    setSuccess(
      'Two-factor authentication is now ON for your account. You will be asked for a code on your next sign-in.'
    )
    setBusy(false)
    await loadFactors()
  }

  async function handleUnenroll() {
    if (!verifiedFactor) return
    if (!confirmUnenroll) {
      setConfirmUnenroll(true)
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
    })
    if (unenrollError) {
      setError(`Could not remove two-factor authentication: ${unenrollError.message}`)
      setBusy(false)
      setConfirmUnenroll(false)
      return
    }
    setConfirmUnenroll(false)
    setSuccess('Two-factor authentication has been removed from your account.')
    setBusy(false)
    await loadFactors()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Two-Factor Authentication
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Add an authenticator-app code to your admin sign-in. Optional — sign-in works
            exactly as before until you enrol.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking your two-factor status…
        </div>
      )}

      {!loading && error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && success && (
        <div className="mb-4 p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {!loading && verifiedFactor && !enrolling && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800 dark:text-green-200">
                Two-factor authentication is ON
              </p>
              <p className="text-green-700 dark:text-green-300 mt-0.5">
                Enrolled{' '}
                {new Date(verifiedFactor.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                . You will be asked for a 6-digit code from your authenticator app after
                entering your password.
              </p>
            </div>
          </div>

          {confirmUnenroll ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Remove two-factor authentication?
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Your account will be protected by password only. You can enrol again any time.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleUnenroll}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Yes, remove 2FA
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUnenroll(false)}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-60"
                >
                  Keep 2FA
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUnenroll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <Trash2 className="w-4 h-4" />
              Remove two-factor authentication
            </button>
          )}
        </div>
      )}

      {!loading && !verifiedFactor && !enrolling && (
        <div className="space-y-4">
          {unverifiedFactorId ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    A previous setup was not finished
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    The secret from that attempt was only shown once and cannot be recovered,
                    so that factor has to be discarded before you can start again.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDiscardUnverified}
                disabled={busy}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition disabled:opacity-60 inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Discard incomplete setup
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600">
                <ShieldAlert className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Two-factor authentication is <strong>off</strong> for your account. Your
                  password is the only thing protecting admin access — including user
                  deletion and commissions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartEnroll}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-60 inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Set up two-factor authentication
              </button>
            </>
          )}
        </div>
      )}

      {!loading && !verifiedFactor && enrolling && (
        <form onSubmit={handleConfirmEnroll} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Add this account to your authenticator app (Google Authenticator, Authy, 1Password,
            etc.) using the secret or the setup URI below, then enter the 6-digit code it
            shows to confirm.
          </p>

          <CopyField label="Secret key" value={enrolling.secret} />
          <CopyField label="Setup URI (paste into your authenticator app)" value={enrolling.uri} />

          <div>
            <label
              htmlFor="mfa-setup-code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              6-digit code from your authenticator app
            </label>
            <input
              id="mfa-setup-code"
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-400 text-sm text-center tracking-[0.5em] font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-60 inline-flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Verify and enable 2FA
            </button>
            <button
              type="button"
              onClick={handleCancelEnroll}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-60"
            >
              Cancel setup
            </button>
          </div>
        </form>
      )}

      <p className="mt-5 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
        Lost access to your authenticator app? An admin with Supabase dashboard access can
        remove the lost factor (Auth → Users → your account → Factors) so you can sign in
        and enrol again.
      </p>
    </div>
  )
}
