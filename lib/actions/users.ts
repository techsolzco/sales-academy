'use server'
import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/** CSPRNG temp password: 12 random bytes -> 16 URL-safe base64 chars (96 bits of entropy). */
function generateTempPassword(): string {
  return randomBytes(12).toString('base64url')
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

  // Temp password (B17/S10): never a hardcoded default. If the admin supplied
  // a password, use it; otherwise generate a per-user CSPRNG password and
  // RETURN it to the calling admin so they can share it with the new user
  // (no email is sent here — welcome-email delivery is part of the pending
  // registration decision). NOTE: components/admin/CreateUserModal.tsx does
  // not display the returned password yet — it must be updated to show it,
  // or the admin will never see the generated password.
  const password = data.password || generateTempPassword()

  const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
    email: data.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName
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
      role: data.role,
      full_name: data.fullName,
      phone: data.phone || null,
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

  return { data: { id: authData.user.id, tempPassword: password } }
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
