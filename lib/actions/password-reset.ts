'use server'

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
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('password_reset_requests')
    .insert({ email: email.toLowerCase().trim(), full_name: full_name || null })
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

    // Generate temp password
    const tempPassword = 'TempPass' + Math.floor(100000 + Math.random() * 900000)

    // Find the user by email
    const { data: { users } } = await serviceClient.auth.admin.listUsers()
    const targetUser = users.find(u => u.email?.toLowerCase() === req.email.toLowerCase())
    
    if (targetUser) {
      await serviceClient.auth.admin.updateUserById(targetUser.id, { password: tempPassword })
    }

    // Mark as approved
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
    await serviceClient.from('password_reset_requests').update({
      status: 'rejected',
      admin_note: note || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', id)
    revalidatePath('/admin/password-resets')
    return { data: undefined }
  } catch (e: any) { return { error: e.message } }
}
