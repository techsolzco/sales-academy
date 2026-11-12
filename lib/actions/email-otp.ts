'use server'
import { randomInt, createHash, timingSafeEqual } from 'crypto'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ActionResult } from '@/types'
import { sendEmailOtp } from '@/lib/email'

/**
 * Email OTP verification for the enrollment (sign-up) form.
 *
 * Flow: applicant enters email → requestEmailOtp sends a 6-digit code via
 * the existing Resend infra → verifyEmailOtp checks it → only then may
 * submitEnrollmentApplication insert a `pending` application (it enforces
 * this server-side via isEmailVerified; the form UI is not the gate).
 *
 * Security (audit S2/B1, S10):
 * - Code is generated with crypto.randomInt (CSPRNG), never Math.random.
 * - Only the SHA-256 hash is stored; the plaintext code is never stored
 *   or logged, and exists only in the email sent to the applicant.
 * - 10-minute expiry, max 5 verify attempts per code, max 3 codes per
 *   email per hour, 60s between sends.
 * - Table `email_verification_codes` is RLS-enabled with NO policies:
 *   anon/authenticated roles can read/write nothing; only the service-role
 *   client used here (which bypasses RLS) touches it.
 */

const CODE_TTL_MINUTES = 10
const CODE_TTL_SECONDS = CODE_TTL_MINUTES * 60
const MAX_VERIFY_ATTEMPTS = 5
const MAX_CODES_PER_HOUR = 3
const RESEND_COOLDOWN_SECONDS = 60
/** A successful verification stays valid for submit for this long. */
const VERIFIED_VALID_HOURS = 24

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** True when this email has a verification completed within the valid window. */
export async function isEmailVerified(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase()
  if (!isValidEmail(cleanEmail)) return false
  const serviceClient = getServiceClient()
  const since = new Date(Date.now() - VERIFIED_VALID_HOURS * 60 * 60 * 1000).toISOString()
  const { data } = await serviceClient
    .from('email_verification_codes')
    .select('id')
    .eq('email', cleanEmail)
    .not('verified_at', 'is', null)
    .gt('verified_at', since)
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return !!data
}

/**
 * Send a fresh 6-digit verification code to `email`.
 * Rate limits: max 3 codes / email / hour, 60s between sends. Any previous
 * unverified code for the email is invalidated when a new one is issued.
 */
export async function requestEmailOtp(
  email: string,
  fullName?: string
): Promise<ActionResult<{ expiresInSeconds: number }>> {
  const cleanEmail = email.trim().toLowerCase()
  if (!isValidEmail(cleanEmail)) {
    return { error: 'Please enter a valid email address.' }
  }

  const serviceClient = getServiceClient()
  const now = new Date()
  const nowIso = now.toISOString()

  // 60s cooldown: check the most recent code for this email.
  const { data: lastCode } = await serviceClient
    .from('email_verification_codes')
    .select('created_at')
    .eq('email', cleanEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastCode) {
    const waitMs =
      RESEND_COOLDOWN_SECONDS * 1000 -
      (now.getTime() - new Date(lastCode.created_at).getTime())
    if (waitMs > 0) {
      return { error: `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting another code.` }
    }
  }

  // Max 3 codes per email per hour.
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const { count } = await serviceClient
    .from('email_verification_codes')
    .select('id', { count: 'exact', head: true })
    .eq('email', cleanEmail)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= MAX_CODES_PER_HOUR) {
    return { error: 'Too many codes requested for this email. Please try again in an hour.' }
  }

  // Invalidate any previous unverified code for this email.
  await serviceClient
    .from('email_verification_codes')
    .update({ expires_at: nowIso })
    .eq('email', cleanEmail)
    .is('verified_at', null)
    .gt('expires_at', nowIso)

  const code = String(randomInt(100000, 1000000))
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

  const { data: row, error: insertErr } = await serviceClient
    .from('email_verification_codes')
    .insert({
      email: cleanEmail,
      code_hash: hashCode(code),
      expires_at: expiresAt,
      attempts: 0,
      verified_at: null,
    })
    .select('id')
    .single()

  if (insertErr || !row) {
    return { error: `Could not create a verification code: ${insertErr?.message ?? 'unknown error'}` }
  }

  // Send the code; on failure remove the row so the attempt does not burn
  // the hourly quota and the user can retry immediately.
  const sent = await sendEmailOtp({
    email: cleanEmail,
    code,
    fullName: fullName?.trim() || undefined,
    expiresInMinutes: CODE_TTL_MINUTES,
  })
  if (!sent.ok) {
    await serviceClient.from('email_verification_codes').delete().eq('id', row.id)
    return { error: 'Could not send the verification code. Please try again.' }
  }

  return { data: { expiresInSeconds: CODE_TTL_SECONDS } }
}

/**
 * Verify a 6-digit code. Max 5 attempts per code; a wrong code increments
 * `attempts`, an expired/missing code errors, a correct code stamps
 * `verified_at`. Comparison is constant-time on the SHA-256 hashes.
 */
export async function verifyEmailOtp(
  email: string,
  code: string
): Promise<ActionResult<{ verifiedAt: string }>> {
  const cleanEmail = email.trim().toLowerCase()
  if (!isValidEmail(cleanEmail)) {
    return { error: 'Please enter a valid email address.' }
  }
  if (!/^\d{6}$/.test(code.trim())) {
    return { error: 'Please enter the 6-digit code sent to your email.' }
  }

  const serviceClient = getServiceClient()
  const nowIso = new Date().toISOString()

  const { data: row } = await serviceClient
    .from('email_verification_codes')
    .select('id, code_hash, attempts')
    .eq('email', cleanEmail)
    .is('verified_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) {
    return { error: 'Verification code expired or not found. Please request a new code.' }
  }

  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    await serviceClient
      .from('email_verification_codes')
      .update({ expires_at: nowIso })
      .eq('id', row.id)
    return { error: 'Too many incorrect attempts. Please request a new code.' }
  }

  const candidate = Buffer.from(hashCode(code.trim()), 'hex')
  const expected = Buffer.from(row.code_hash, 'hex')
  const match =
    candidate.length === expected.length && timingSafeEqual(candidate, expected)

  if (!match) {
    const attempts = row.attempts + 1
    const remaining = MAX_VERIFY_ATTEMPTS - attempts
    await serviceClient
      .from('email_verification_codes')
      .update({
        attempts,
        ...(remaining <= 0 ? { expires_at: nowIso } : {}),
      })
      .eq('id', row.id)
    return {
      error:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new code.',
    }
  }

  const { error: updateErr } = await serviceClient
    .from('email_verification_codes')
    .update({ verified_at: nowIso, attempts: row.attempts + 1 })
    .eq('id', row.id)

  if (updateErr) {
    return { error: `Could not confirm verification: ${updateErr.message}` }
  }

  return { data: { verifiedAt: nowIso } }
}
