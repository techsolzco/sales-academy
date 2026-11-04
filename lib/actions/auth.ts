'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
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

  // Basic validation
  if (!currentPassword) {
    return { error: 'Please enter your current password.' }
  }
  if (!newPassword || newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters long.' }
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

  return { data: undefined }
}
