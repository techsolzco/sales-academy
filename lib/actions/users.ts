'use server'
import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ActionResult } from '@/types'

/** CSPRNG temp password: 12 random bytes -> 16 URL-safe base64 chars (96 bits of entropy). */
function generateTempPassword(): string {
  return randomBytes(12).toString('base64url')
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

/**
 * Shared Auth-user + profile creation path used by `createUser` and
 * `bulkCreateUsers` (audit §3 #4). Creates the Auth user with a per-user
 * CSPRNG temp password (B17/S10 — never a hardcoded default), then updates
 * the trigger-created profile row and verifies the write actually affected
 * a row. Returns the Auth id and the temp password, which the calling admin
 * must share with the new user (no email is sent here — the admin shares
 * temp passwords via WhatsApp).
 */
async function createAuthUserWithProfile(
  sbAdmin: SupabaseClient,
  input: { fullName: string; email: string; phone?: string; password?: string; role: 'admin' | 'salesman' }
): Promise<{ id: string; tempPassword: string } | { error: string }> {
  // Temp password (B17/S10): never a hardcoded default. If the admin supplied
  // a password, use it; otherwise generate a per-user CSPRNG password and
  // RETURN it to the calling admin so they can share it with the new user
  // (no email is sent here — welcome-email delivery is part of the pending
  // registration decision).
  const password = input.password || generateTempPassword()

  const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
    email: input.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'User creation failed' }
  }

  // Update profile created by the trigger. Verify the write actually affected
  // a row (B17): checking only `profileError` silently passes when the
  // trigger never created a profile row and the update touches 0 rows.
  const { data: updatedProfiles, error: profileError } = await sbAdmin
    .from('profiles')
    .update({
      role: input.role,
      full_name: input.fullName,
      phone: input.phone || null,
      status: 'active'
    })
    .eq('id', authData.user.id)
    .select('id')

  if (profileError) {
    return { error: 'User created but profile update failed: ' + profileError.message }
  }
  if (!updatedProfiles || updatedProfiles.length === 0) {
    return { error: `User created in Auth (id ${authData.user.id}) but no profile row exists to update — the creation trigger did not run. Ask an admin to repair the profile before the user signs in.` }
  }

  return { id: authData.user.id, tempPassword: password }
}

/**
 * @deprecated `skipAuthCheck` no longer bypasses anything (B60). The session
 * is ALWAYS verified and the caller must be an admin; the parameter is kept
 * only so the existing caller (app/admin/salesmen/page.tsx, a server
 * component under the admin-only /admin route) keeps compiling. It is ignored.
 */
export async function fetchTeamMembers(skipAuthCheck = false) {
  void skipAuthCheck
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return []
  const sbAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await sbAdmin
    .from('profiles')
    .select('id, full_name, email, avatar_url, status, created_at, phone, role')
    .order('full_name')

  return data ?? []
}


export async function createUser(data: {
  fullName: string
  email: string
  password?: string
  role: 'admin' | 'salesman'
  phone?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin') return { error: 'Not authorized' }

  const sbAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // NOTE: components/admin/CreateUserModal.tsx displays the returned
  // password once so the admin can share it — it must be updated to show it,
  // or the admin will never see the generated password.
  const result = await createAuthUserWithProfile(sbAdmin, {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: data.role,
  })

  if ('error' in result) {
    return { error: result.error }
  }

  return { data: { id: result.id, tempPassword: result.tempPassword } }
}

// ─── Bulk user import (CSV) — audit §3 #4 ───────────────────────────────────
// Admin only. Creates many salesman accounts in one call, reusing the exact
// creation path as createUser (createAuthUserWithProfile) so every user gets
// their own CSPRNG temp password. One bad row never stops the batch: each
// row is validated, duplicate-checked and created independently, and the
// result reports per-row success/failure. Temp passwords are returned to
// the admin in the result — the admin shares them via WhatsApp (no email
// is sent here).

export interface BulkUserRow {
  full_name: string
  email: string
  phone?: string
}

export interface BulkCreatedUser {
  email: string
  full_name: string
  tempPassword: string
}

export interface BulkFailedRow {
  /** 1-based row number in the submitted batch (header row excluded). */
  row: number
  email: string
  reason: string
}

export interface BulkCreateUsersResult {
  created: BulkCreatedUser[]
  failed: BulkFailedRow[]
}

const BULK_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BULK_ROWS = 200

export async function bulkCreateUsers(rows: BulkUserRow[]): Promise<ActionResult<BulkCreateUsersResult>> {
  try {
    await requireAdmin()

    if (!Array.isArray(rows) || rows.length === 0) {
      return { error: 'No rows to import.' }
    }
    if (rows.length > MAX_BULK_ROWS) {
      return { error: `Too many rows (${rows.length}). Import at most ${MAX_BULK_ROWS} users at a time.` }
    }

    const sbAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // One query up front: all existing profile emails, so duplicates against
    // the database are caught without a query per row.
    const { data: existingProfiles, error: existingError } = await sbAdmin
      .from('profiles')
      .select('email')
    if (existingError) {
      return { error: 'Could not check existing users: ' + existingError.message }
    }
    const existingEmails = new Set(
      (existingProfiles ?? [])
        .map((p) => String(p.email ?? '').trim().toLowerCase())
        .filter(Boolean)
    )

    const seenInFile = new Set<string>()
    const created: BulkCreatedUser[] = []
    const failed: BulkFailedRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const rowNo = i + 1
      const fullName = (rows[i]?.full_name ?? '').trim()
      const email = (rows[i]?.email ?? '').trim()
      const phone = (rows[i]?.phone ?? '').trim()

      if (!fullName) {
        failed.push({ row: rowNo, email, reason: 'Full name is empty.' })
        continue
      }
      if (!email || !BULK_EMAIL_RE.test(email)) {
        failed.push({ row: rowNo, email, reason: 'Invalid email address.' })
        continue
      }
      const key = email.toLowerCase()
      if (seenInFile.has(key)) {
        failed.push({ row: rowNo, email, reason: 'Duplicate email in this file.' })
        continue
      }
      seenInFile.add(key)
      if (existingEmails.has(key)) {
        failed.push({ row: rowNo, email, reason: 'A user with this email already exists.' })
        continue
      }

      // Same creation path as single-user createUser: per-user CSPRNG temp
      // password, Auth user + verified profile write.
      const result = await createAuthUserWithProfile(sbAdmin, {
        fullName,
        email,
        phone: phone || undefined,
        role: 'salesman',
      })
      if ('error' in result) {
        failed.push({ row: rowNo, email, reason: result.error })
        continue
      }
      existingEmails.add(key)
      created.push({ email, full_name: fullName, tempPassword: result.tempPassword })
    }

    if (created.length > 0) revalidatePath('/admin/salesmen')
    return { data: { created, failed } }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// â”€â”€â”€ Deactivate / reactivate a salesman â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Uses profiles.status (check: 'active' | 'inactive' | 'suspended').
// Middleware already redirects non-active users to /auth/pending â€” no migration needed.

export async function deactivateUser(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id === targetId) return { error: 'You cannot deactivate your own account.' }
  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { error: 'Not authorized' }

  // Service client, consistent with deleteUserPermanently (B79): the write
  // must not depend on RLS on the anon client.
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Guard (B79): an admin cannot deactivate another admin. (Self-deactivation
  // is already blocked above.) Admin offboarding goes through
  // deleteUserPermanently, which carries the last-admin guard.
  const { data: targetProfile } = await sb
    .from('profiles').select('role').eq('id', targetId).single()
  if (!targetProfile) return { error: 'User not found.' }
  if (targetProfile.role === 'admin') {
    return { error: 'Admin accounts cannot be deactivated. Use permanent delete (which guards the last admin) instead.' }
  }

  const { data: updated, error } = await sb.from('profiles').update({ status: 'inactive' }).eq('id', targetId).select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'User not found.' }
  revalidatePath('/admin/salesmen')
  return {}
}

export async function reactivateUser(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { error: 'Not authorized' }
  const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', targetId)
  if (error) return { error: error.message }
  revalidatePath('/admin/salesmen')
  return {}
}

// ─── Activity count (called client-side before showing delete modal) ───────────
// Returns counts of records that will be cascade-deleted with the user.
export async function getUserActivityCount(targetId: string): Promise<{
  quizAttempts: number
  assignmentSubmissions: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { quizAttempts: 0, assignmentSubmissions: 0, error: 'Not authenticated' }
  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { quizAttempts: 0, assignmentSubmissions: 0, error: 'Not authorized' }

  const [{ count: qa }, { count: as }] = await Promise.all([
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
    supabase.from('assignment_rule_submissions').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
  ])

  return { quizAttempts: qa ?? 0, assignmentSubmissions: as ?? 0 }
}

// ─── Permanent delete ─────────────────────────────────────────────────────────
// Deletes the Supabase Auth user (which cascades to profiles, then to all
// ON DELETE CASCADE tables). Before deletion:
//   1. Guard: cannot delete self
//   2. Guard: cannot delete the last remaining admin
//   3. Handles RESTRICT FKs by re-assigning to current admin:
//      - courses.created_by (NOT NULL RESTRICT)
//      - course_assignments.assigned_by (NOT NULL RESTRICT)
// All other FK children either CASCADE or SET NULL automatically.
export async function deleteUserPermanently(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id === targetId) return { error: 'You cannot delete your own account.' }

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { error: 'Not authorized' }

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Guard: check target profile exists
  const { data: targetProfile } = await sb
    .from('profiles').select('role').eq('id', targetId).single()
  if (!targetProfile) return { error: 'User not found.' }

  // Guard: never delete the last admin
  if (targetProfile.role === 'admin') {
    const { count } = await sb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
    if ((count ?? 0) <= 1) {
      return { error: 'Cannot delete the last admin account. Promote another admin first.' }
    }
  }

  // Handle RESTRICT FKs — re-assign to current admin before deleting
  // courses.created_by NOT NULL RESTRICT
  await sb.from('courses').update({ created_by: user.id }).eq('created_by', targetId)
  // course_assignments.assigned_by NOT NULL RESTRICT
  await sb.from('course_assignments').update({ assigned_by: user.id }).eq('assigned_by', targetId)

  // Delete the auth user — cascades to profiles → all CASCADE children auto-deleted
  const { error: deleteError } = await sb.auth.admin.deleteUser(targetId)
  if (deleteError) return { error: deleteError.message }

  revalidatePath('/admin/salesmen')
  return {}
}
