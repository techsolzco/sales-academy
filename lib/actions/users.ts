'use server'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function fetchTeamMembers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin') return []

  const { data } = await supabase
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

  const password = data.password || 'Temporary123!'

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

  // Update profile created by the trigger
  const { error: profileError } = await sbAdmin
    .from('profiles')
    .update({
      role: data.role,
      full_name: data.fullName,
      phone: data.phone || null,
      status: 'active'
    })
    .eq('id', authData.user.id)

  if (profileError) {
    return { error: 'User created but profile update failed: ' + profileError.message }
  }

  return { data: { id: authData.user.id } }
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
  const { error } = await supabase.from('profiles').update({ status: 'inactive' }).eq('id', targetId)
  if (error) return { error: error.message }
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
