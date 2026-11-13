'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { recordLogin } from '@/lib/actions/login-history'
import type { ActionResult } from '@/types'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// In-memory rate limiting map: userId -> { attempts: number, resetAt: number }
const failedAttemptsMap = new Map<string, { attempts: number; resetAt: number }>()

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { error: 'You must be logged in to change your password.' }
  }

  const { currentPassword, newPassword, confirmPassword } = input

  // Status check (B16): a suspended/inactive user with a live session cannot
  // change their password. A missing profile row is left to the middleware
  // (which already redirects profile-less sessions to login) — it does not
  // block here, so a profile-creation failure cannot lock a user out of
  // fixing their own credentials.
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle()
  if (callerProfile && callerProfile.status !== 'active') {
    return { error: 'Your account is not active. Please contact an admin.' }
  }

  // Basic validation
  if (!currentPassword) {
    return { error: 'Please enter your current password.' }
  }
  if (!newPassword || newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters long.' }
  }
  if (newPassword !== confirmPassword) {
    return { error: 'New password and confirm password do not match.' }
  }
  if (currentPassword === newPassword) {
    return { error: 'New password cannot be the same as your current password.' }
  }

  // Rate-limiting check: max 5 failed attempts in 5 minutes
  const now = Date.now()
  const rateLimitKey = user.id
  const userRateLimit = failedAttemptsMap.get(rateLimitKey)
  if (userRateLimit && userRateLimit.resetAt > now && userRateLimit.attempts >= 5) {
    const minutesLeft = Math.ceil((userRateLimit.resetAt - now) / 60000)
    return {
      error: `Too many failed attempts. Please wait ${minutesLeft} minute(s) before trying again.`
    }
  }

  // Verify current password against Supabase Auth
  const serviceClient = getServiceClient()
  const { error: verifyErr } = await serviceClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (verifyErr) {
    // Record failed attempt
    const currentRecord = failedAttemptsMap.get(rateLimitKey)
    if (!currentRecord || currentRecord.resetAt <= now) {
      failedAttemptsMap.set(rateLimitKey, { attempts: 1, resetAt: now + 5 * 60 * 1000 })
    } else {
      currentRecord.attempts += 1
    }
    return { error: 'Current password is incorrect. Please try again.' }
  }

  // Current password is correct -> reset rate limit
  failedAttemptsMap.delete(rateLimitKey)

  // Update password in Supabase Auth (preserves user session)
  const { error: updateErr } = await serviceClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (updateErr) {
    return { error: `Failed to update password: ${updateErr.message}` }
  }

  // Revoke other sessions (B16): a stolen session must not survive a password
  // change. supabase-js v2 exposes signOut({ scope: 'others' }), which revokes
  // every session except this one. Best-effort: if the call fails, the
  // password change itself already succeeded, so log and continue rather
  // than reporting the whole change as failed.
  try {
    await supabase.auth.signOut({ scope: 'others' })
  } catch (e) {
    console.warn('[changePassword] Failed to revoke other sessions:', e)
  }

  return { data: undefined }
}

/**
 * Login history (audit §3 #20) — record the current user's password sign-in.
 *
 * The auth callback route only records PKCE/email-flow sign-ins, so the
 * primary password login (app/auth/login/page.tsx) would otherwise never
 * be recorded. The login page calls this fire-and-forget right after a
 * successful signInWithPassword.
 *
 * The user id is derived from the session server-side — never from a
 * client-supplied value — and the IP / user-agent come from this request's
 * headers (x-forwarded-for first entry). Never throws to the caller in a
 * way that can block login: recordLogin itself never throws, and the
 * login page does not await this.
 */
export async function recordMyLogin(): Promise<ActionResult<{ isNewDevice: boolean }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const headerStore = headers()
    const forwardedFor = headerStore.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || null
    const userAgent = headerStore.get('user-agent')

    return await recordLogin(user.id, ip, userAgent)
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to record login' }
  }
}
