'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ResellerApplication = {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  created_at: string
  profile?: any
}

export type Commission = {
  id: string
  reseller_id: string
  amount: number
  description: string
  status: 'pending' | 'paid'
  created_at: string
  paid_at?: string
}

export async function requestResellerUpgrade(learned_summary?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('reseller_applications')
    .insert([{ 
      user_id: user.id, 
      status: 'pending',
      learned_summary: learned_summary || null,
      agreed_to_terms: true,
      pledge_submitted_at: new Date().toISOString()
    }])

  if (error) throw error
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/reseller')
}

export async function fetchMyResellerApplication() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('reseller_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function fetchResellerApplications() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reseller_applications')
    .select(`
      *,
      profile:profiles(id, full_name, email, avatar_url)
    `)
    .order('created_at', { ascending: false })
  
  return data || []
}

export async function approveResellerApplication(id: string, salesPortalUrl?: string) {
  const supabase = await createClient()
  
  // Get application to get user_id
  const { data: app } = await supabase
    .from('reseller_applications')
    .select('user_id')
    .eq('id', id)
    .single()
    
  if (app) {
    // Update application
    await supabase
      .from('reseller_applications')
      .update({ status: 'approved' })
      .eq('id', id)
      
    // Update profile
    await supabase
      .from('profiles')
      .update({ 
        is_reseller: true,
        sales_portal_url: salesPortalUrl || null
      })
      .eq('id', app.user_id)
  }
  revalidatePath('/admin/reseller-requests')
}

export async function rejectResellerApplication(id: string, reason: string) {
  const supabase = await createClient()
  await supabase
    .from('reseller_applications')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', id)
  revalidatePath('/admin/reseller-requests')
}

export async function fetchResellers() {
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, is_reseller, commissions(amount, status)')
    .eq('is_reseller', true)

  if (!profiles) return []

  return profiles.map(p => {
    const comms = (p.commissions as any[]) || []
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      avatar_url: p.avatar_url,
      total_paid: comms.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
      total_pending: comms.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
      commission_count: comms.length
    }
  })
}

export async function fetchCommissions(resellerId?: string) {
  const supabase = await createClient()
  let targetId = resellerId

  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    targetId = user.id
  }

  const { data } = await supabase
    .from('commissions')
    .select('*')
    .eq('reseller_id', targetId)
    .order('created_at', { ascending: false })

  return data || []
}

export async function addCommission(resellerId: string, amount: number, description: string) {
  const supabase = await createClient()
  await supabase
    .from('commissions')
    .insert([{ reseller_id: resellerId, amount, description, status: 'pending' }])
  revalidatePath('/admin/resellers/[id]')
}

export async function markCommissionPaid(commissionId: string) {
  const supabase = await createClient()
  await supabase
    .from('commissions')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', commissionId)
  revalidatePath('/admin/resellers/[id]')
}
