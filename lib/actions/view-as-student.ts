'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user, adminName: profile.full_name as string }
}

// Start impersonating a student — sets a cookie + logs to admin_audit_logs
export async function startViewAsStudent(targetUserId: string): Promise<ActionResult> {
  try {
    const { user, adminName } = await requireAdmin()
    const sb = getServiceClient()

    // Verify the target user is an active salesman
    const { data: targetProfile, error: profileErr } = await sb
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('id', targetUserId)
      .single()

    if (profileErr || !targetProfile) return { error: 'Student not found' }
    if (targetProfile.role !== 'salesman') return { error: 'Target user is not a student/salesman' }
    if (targetProfile.status !== 'active') return { error: 'Target student is not active' }

    // Log to audit table — insert if table exists, skip if not (graceful)
    try {
      await sb.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: adminName,
        action: 'view_as_student',
        target_user_id: targetUserId,
        target_user_name: targetProfile.full_name,
        details: `Admin started viewing portal as student "${targetProfile.full_name}"`,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Table may not exist yet — non-fatal, still proceed
      console.warn('[ViewAs] admin_audit_logs insert skipped (table may not exist)')
    }

    // Set impersonation cookie (expires in 2 hours)
    const cookieStore = await cookies()
    cookieStore.set('view_as_user_id', targetUserId, {
      maxAge: 60 * 60 * 2,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
    cookieStore.set('view_as_user_name', targetProfile.full_name ?? 'Student', {
      maxAge: 60 * 60 * 2,
      httpOnly: false, // readable by client for banner display
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return { data: undefined }
  } catch (e: any) {
    return { error: e.message }
  }
}

// Stop impersonation — clear cookies
export async function stopViewAsStudent(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('view_as_user_id')
    cookieStore.delete('view_as_user_name')
    revalidatePath('/dashboard')
    return { data: undefined }
  } catch (e: any) {
    return { error: e.message }
  }
}

// Get list of all active salesmen for the admin page
export async function fetchActiveSalesmen() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return []

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, status, created_at, phone')
    .eq('role', 'salesman')
    .order('full_name')

  return data ?? []
}
