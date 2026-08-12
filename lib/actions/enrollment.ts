'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { ActionResult, EnrollmentApplication } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface EnrollmentInput {
  full_name: string
  email: string
  phone?: string
  password: string
  knowledge_level?: 'beginner' | 'intermediate' | 'advanced'
  desired_course?: string
  reason?: string
  prior_experience?: string
}

export async function submitEnrollmentApplication(
  input: EnrollmentInput
): Promise<ActionResult> {
  const supabase = await createClient()

  // Insert application (public — no auth required)
  const { data: app, error: appErr } = await supabase
    .from('enrollment_applications')
    .insert({
      full_name: input.full_name,
      email: input.email,
      phone: input.phone || null,
      knowledge_level: input.knowledge_level || null,
      desired_course: input.desired_course || null,
      reason: input.reason || null,
      prior_experience: input.prior_experience || null,
      status: 'pending',
    })
    .select()
    .single()

  if (appErr) return { error: appErr.message }

  // Notify all admins using service client (bypasses RLS for insert)
  const serviceClient = getServiceClient()
  const { data: admins } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifs = admins.map((a) => ({
      user_id: a.id,
      title: `New enrollment application from ${input.full_name}`,
      body: `${input.email} wants to join Sales Academy.`,
      type: 'enrollment',
      link: '/admin/enrollments',
    }))
    await serviceClient.from('notifications').insert(notifs)
  }

  return { data: undefined }
}

export async function approveApplication(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Require admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  // Fetch application
  const { data: app, error: fetchErr } = await supabase
    .from('enrollment_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !app) return { error: fetchErr?.message ?? 'Application not found' }
  if (app.status !== 'pending') return { error: 'Application already processed' }

  const serviceClient = getServiceClient()

  // Generate a secure temp password for the new user
  const tempPassword = `SA_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6).toUpperCase()}!`

  // Create Supabase Auth user
  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email: app.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: app.full_name, role: 'salesman' },
  })

  if (authErr) return { error: `Auth user creation failed: ${authErr.message}` }

  const newUserId = authData.user.id

  // Create profile
  const { error: profileErr } = await serviceClient.from('profiles').upsert({
    id: newUserId,
    full_name: app.full_name,
    email: app.email,
    role: 'salesman',
    status: 'active',
  })

  if (profileErr) return { error: `Profile creation failed: ${profileErr.message}` }

  // Mark application approved
  await serviceClient
    .from('enrollment_applications')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Notify the new user
  await serviceClient.from('notifications').insert({
    user_id: newUserId,
    title: '🎉 Your application has been approved!',
    body: `Welcome to Sales Academy, ${app.full_name}! Your login email is ${app.email} and your temporary password is: ${tempPassword}. Please change it after first login.`,
    type: 'enrollment',
    link: '/dashboard',
  })

  revalidatePath('/admin/enrollments')
  return { data: undefined }
}

export async function rejectApplication(
  id: string,
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  // Fetch application to get applicant info
  const { data: app } = await supabase
    .from('enrollment_applications')
    .select('full_name, email')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('enrollment_applications')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/enrollments')
  return { data: undefined }
}

export async function fetchEnrollmentApplications(
  status?: 'pending' | 'approved' | 'rejected'
): Promise<EnrollmentApplication[]> {
  const supabase = await createClient()

  let query = supabase
    .from('enrollment_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data } = await query
  return data ?? []
}
