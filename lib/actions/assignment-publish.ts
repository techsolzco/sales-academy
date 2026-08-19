'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function publishAssignmentToAll(assignmentId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    
    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'salesman')
      .eq('status', 'active')
    
    if (!activeUsers || activeUsers.length === 0) {
      return { error: 'No active salesmen found' }
    }

    const { data: existing } = await supabase
      .from('assignment_submissions')
      .select('user_id')
      .eq('assignment_id', assignmentId)
      
    const existingIds = new Set(existing?.map(e => e.user_id) || [])

    const newSubmissions = activeUsers
      .filter(u => !existingIds.has(u.id))
      .map(u => ({
        assignment_id: assignmentId,
        user_id: u.id,
        status: 'pending',
      }))

    if (newSubmissions.length > 0) {
      const { error } = await supabase.from('assignment_submissions').insert(newSubmissions)
      if (error) return { error: error.message }
    }

    revalidatePath(`/admin/assignments/${assignmentId}`)
    return { data: undefined }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function publishAssignmentToUser(assignmentId: string, userId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    
    const { data: existing } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return { error: 'User is already assigned to this assignment' }
    }

    const { error } = await supabase.from('assignment_submissions').insert({
      assignment_id: assignmentId,
      user_id: userId,
      status: 'pending',
    })

    if (error) return { error: error.message }

    revalidatePath(`/admin/assignments/${assignmentId}`)
    return { data: undefined }
  } catch (e: any) {
    return { error: e.message }
  }
}
