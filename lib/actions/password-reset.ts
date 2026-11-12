'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** CSPRNG temp password: 12 random bytes -> 16 URL-safe base64 chars (96 bits of entropy). */
function generateTempPassword(): string {
  return randomBytes(12).toString('base64url')
}

type ServiceClient = ReturnType<typeof getServiceClient>

/**
 * Find an Auth user by email, paging through listUsers.
 * GoTrue's default page is 50 users, so a single listUsers() call misses
 * any target beyond the first page (B15).
 */
async function findUserByEmail(serviceClient: ServiceClient, email: string) {
  const normalized = email.toLowerCase()
  const perPage = 1000
  let page = 1
  for (;;) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (found) return found
    if (data.users.length < perPage) return null
    page += 1
  }
}

export interface PasswordResetRequest {
  id: string
  email: string
  full_name: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  resolved_at: string | null
}

export async function submitPasswordResetRequest(email: string, full_name?: string): Promise<ActionResult> {
  const normalized = email.toLowerCase().trim()
  const supabase = getServiceClient()

  // Dedup guard (B15): an identical pending request for the same email is
  // not inserted twice — return the same generic success as a fresh request.
  const { data: existing } = await supabase
    .from('password_reset_requests')
    .select('id')
    .eq('email', normalized)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()
  if (existing) return { data: undefined }

  // Existence check (S10), silent by design: the request is recorded only if
  // the email belongs to an Auth user, but the response is identical either
  // way, so this does not reveal whether an account exists for the email.
  // (Timing could theoretically leak it; rate limiting/captcha — S17 — is
  // still open and is the proper mitigation for that.)
  let targetUser: Awaited<ReturnType<typeof findUserByEmail>> = null
  try {
    targetUser = await findUserByEmail(supabase, normalized)
  } catch (e) {
    console.error('[submitPasswordResetRequest] user lookup failed:', e)
    return { data: undefined }
  }
  if (!targetUser) return { data: undefined }

  const { error } = await supabase
    .from('password_reset_requests')
    .insert({ email: normalized, full_name: full_name || null })
  if (error) return { error: error.message }
  return { data: undefined }
}

export async function fetchPasswordResetRequests(): Promise<PasswordResetRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return []
  const { data } = await supabase
    .from('password_reset_requests')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function approvePasswordReset(id: string): Promise<ActionResult<{ tempPassword: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { error: 'Forbidden' }

    const serviceClient = getServiceClient()

    // Get the request
    const { data: req } = await serviceClient.from('password_reset_requests').select('*').eq('id', id).single()
    if (!req) return { error: 'Request not found' }

    // Status guard (B15): only a pending request can be approved. Re-running
    // approve on an already-approved/rejected request is an error, not a
    // fresh temp password.
    if (req.status !== 'pending') {
      return { error: `This request has already been ${req.status}.` }
    }

    // Find the user by email (paged — see findUserByEmail). If the target
    // does not exist, fail WITHOUT marking the request approved and WITHOUT
    // returning a temp password (B15/S10).
    const targetUser = await findUserByEmail(serviceClient, req.email)
    if (!targetUser) {
      return { error: 'No account exists for this email address.' }
    }

    // Generate temp password (S10): CSPRNG, 16 URL-safe chars.
    const tempPassword = generateTempPassword()

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(targetUser.id, { password: tempPassword })
    if (updateError) {
      return { error: `Failed to set temporary password: ${updateError.message}` }
    }

    // Mark as approved — only after the password was actually set.
    await serviceClient.from('password_reset_requests').update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
    }).eq('id', id)

    revalidatePath('/admin/password-resets')
    return { data: { tempPassword } }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function rejectPasswordReset(id: string, note?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { error: 'Forbidden' }

    const serviceClient = getServiceClient()

    // Status guard (B15): only a pending request can be rejected, and the
    // request must exist (previously a reject on a missing id silently
    // "succeeded" with 0 rows affected).
    const { data: req } = await serviceClient.from('password_reset_requests').select('status').eq('id', id).single()
    if (!req) return { error: 'Request not found' }
    if (req.status !== 'pending') {
      return { error: `This request has already been ${req.status}.` }
    }

    await serviceClient.from('password_reset_requests').update({
      status: 'rejected',
      admin_note: note || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', id)
    revalidatePath('/admin/password-resets')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}
