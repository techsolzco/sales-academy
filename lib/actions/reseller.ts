'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

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
  // Payout tracking (audit §3 #6, migration 046). payout_status mirrors
  // `status` and is the canonical payout state going forward.
  payout_status?: 'pending' | 'paid'
  proof_url?: string | null
}

// Proof-upload validation — same rules as the phase-1 fixed upload path
// (lib/actions/storage.ts): image only, 5 MB max, extension derived from
// the validated MIME type, never from the client-supplied filename.
const PROOF_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const PROOF_ALLOWED_MIME_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

// Dedicated bucket for payment proofs (migration 046). The fixed upload
// path in storage.ts / /api/upload-image is admin-only, so resellers cannot
// use it — proofs go here, under a fixed per-reseller folder.
const COMMISSION_PROOF_BUCKET = 'commission-proofs'

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
  const { supabase } = await requireAdmin()
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
  const { supabase } = await requireAdmin()
  
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
  const { supabase } = await requireAdmin()
  await supabase
    .from('reseller_applications')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', id)
  revalidatePath('/admin/reseller-requests')
}

export async function fetchResellers() {
  const { supabase } = await requireAdmin()
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // No id = own commissions (staff reseller dashboard). An explicit id for
  // somebody else is admin-only (admin reseller detail page).
  let targetId = resellerId
  if (targetId && targetId !== user.id) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Forbidden')
  }
  if (!targetId) targetId = user.id

  const { data } = await supabase
    .from('commissions')
    .select('*')
    .eq('reseller_id', targetId)
    .order('created_at', { ascending: false })

  return data || []
}

// The logged-in reseller's own commissions, with payout status and proof
// URL (audit §3 #6). Only users flagged is_reseller may call this.
export async function fetchMyCommissions(): Promise<ActionResult<Commission[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_reseller')
      .eq('id', user.id)
      .single()
    if (!profile?.is_reseller) return { error: 'Not a reseller' }

    const { data, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('reseller_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { data: (data || []) as Commission[] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to load commissions' }
  }
}

// Upload a payment-proof image for one of the caller's own commissions.
// DEVIATION from the phase-1 fixed upload path, by design: uploadImage /
// /api/upload-image require an admin session, so a reseller can never use
// them. This action re-implements the same server-side validation
// (image-only MIME allowlist, 5 MB cap, extension from MIME, random UUID
// filename, fixed bucket + fixed per-user folder — the bucket/folder are
// never accepted from the client) against the dedicated
// `commission-proofs` bucket (migration 046). The upload itself goes
// through the session client so the storage RLS policy (first folder
// segment must equal auth.uid()) backstops the fixed path; the commissions
// row is then updated via the service client because resellers have no
// direct UPDATE policy on commissions (deliberate — a broad owner UPDATE
// would let a reseller rewrite amount/status via the API).
export async function uploadCommissionProof(
  commissionId: string,
  file: File
): Promise<ActionResult<{ proof_url: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Ownership: the commission must exist and belong to the caller.
    const { data: commission, error: fetchError } = await supabase
      .from('commissions')
      .select('id, reseller_id, payout_status, status')
      .eq('id', commissionId)
      .single()
    if (fetchError || !commission) return { error: 'Commission not found' }
    if (commission.reseller_id !== user.id) return { error: 'Forbidden' }
    if (commission.payout_status === 'paid' || commission.status === 'paid') {
      return { error: 'This commission is already paid' }
    }

    const ext =
      PROOF_ALLOWED_MIME_TYPES[file.type as keyof typeof PROOF_ALLOWED_MIME_TYPES]
    if (!ext) {
      return { error: 'Only PNG, JPEG and WebP images are allowed' }
    }
    if (file.size > PROOF_MAX_FILE_SIZE) {
      return { error: 'Image must be under 5MB' }
    }

    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await supabase.storage
      .from(COMMISSION_PROOF_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadError) return { error: uploadError.message }

    const {
      data: { publicUrl },
    } = supabase.storage.from(COMMISSION_PROOF_BUCKET).getPublicUrl(path)

    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('commissions')
      .update({ proof_url: publicUrl })
      .eq('id', commissionId)
      .eq('reseller_id', user.id)
    if (updateError) return { error: updateError.message }

    revalidatePath('/dashboard/reseller')
    revalidatePath('/admin/resellers')
    return { data: { proof_url: publicUrl } }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

export async function addCommission(resellerId: string, amount: number, description: string) {
  const { supabase } = await requireAdmin()
  await supabase
    .from('commissions')
    .insert([{ reseller_id: resellerId, amount, description, status: 'pending' }])
  revalidatePath('/admin/resellers/[id]')
}

export async function markCommissionPaid(
  commissionId: string
): Promise<ActionResult<Commission>> {
  const { supabase } = await requireAdmin()

  // Proof is mandatory (audit §3 #6): a commission may only be marked paid
  // once the reseller has uploaded payment proof.
  const { data: commission, error: fetchError } = await supabase
    .from('commissions')
    .select('id, proof_url, payout_status, status')
    .eq('id', commissionId)
    .single()
  if (fetchError || !commission) return { error: 'Commission not found' }
  if (!commission.proof_url) {
    return { error: 'Payment proof is required — the reseller must upload proof first' }
  }
  if (commission.payout_status === 'paid' || commission.status === 'paid') {
    return { error: 'This commission is already paid' }
  }

  const { data, error } = await supabase
    .from('commissions')
    .update({
      status: 'paid',
      payout_status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', commissionId)
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/resellers/[id]')
  return { data: data as Commission }
}
