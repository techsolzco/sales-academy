'use server'
import { SITE_NAME } from '@/lib/config/site'

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
  avatar_url?: string
  whatsapp?: string
  instagram?: string
  facebook?: string
  linkedin?: string
}

export async function submitEnrollmentApplication(
  input: EnrollmentInput
): Promise<ActionResult> {
  const serviceClient = getServiceClient()
  const cleanEmail = input.email.trim().toLowerCase()
  const fullName = input.full_name.trim()

  if (!input.password || input.password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  // Guard: check if email already exists in profiles
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id, role')
    .eq('email', cleanEmail)
    .maybeSingle()

  if (existingProfile) {
    return { error: 'An account with this email already exists. Please log in or use a different email.' }
  }

  // Also check existing applications
  const { data: existingApp } = await serviceClient
    .from('enrollment_applications')
    .select('id, status')
    .eq('email', cleanEmail)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existingApp) {
    return { error: 'An account with this email already exists. Please log in or use a different email.' }
  }

  // Create user directly in Supabase Auth using the user's chosen password
  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email: cleanEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'salesman',
    },
  })

  if (authErr) {
    if (authErr.message.toLowerCase().includes('already') || authErr.message.toLowerCase().includes('registered')) {
      return { error: 'An account with this email already exists. Please log in or use a different email.' }
    }
    return { error: `Signup failed: ${authErr.message}` }
  }

  const newUserId = authData.user.id

  // Create or update profile with all provided metadata
  const { error: profileErr } = await serviceClient.from('profiles').upsert({
    id: newUserId,
    full_name: fullName,
    email: cleanEmail,
    role: 'salesman',
    status: 'active',
    avatar_url: input.avatar_url || null,
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    instagram: input.instagram?.trim() || null,
    facebook: input.facebook?.trim() || null,
    linkedin: input.linkedin?.trim() || null,
  })

  if (profileErr) {
    console.error('Profile creation error during signup:', profileErr)
  }

  // Insert application record for auditing and admin tracking
  const { error: appErr } = await serviceClient
    .from('enrollment_applications')
    .insert({
      full_name: fullName,
      email: cleanEmail,
      phone: input.phone?.trim() || null,
      knowledge_level: input.knowledge_level || null,
      desired_course: input.desired_course || null,
      reason: input.reason || null,
      prior_experience: input.prior_experience || null,
      avatar_url: input.avatar_url || null,
      whatsapp: input.whatsapp?.trim() || null,
      instagram: input.instagram?.trim() || null,
      facebook: input.facebook?.trim() || null,
      linkedin: input.linkedin?.trim() || null,
      status: 'approved',
    })

  if (appErr) {
    console.error('Application record insert error:', appErr)
  }

  // Notify admins
  const { data: admins } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifs = admins.map((a) => ({
      user_id: a.id,
      title: `New salesman registered: ${fullName}`,
      body: `${cleanEmail} joined ${SITE_NAME}.`,
      type: 'enrollment',
      link: '/admin/salesmen',
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

  // Check if profile already exists
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id, role, status')
    .eq('email', app.email)
    .maybeSingle()

  if (existingProfile) {
    if (existingProfile.role === 'admin') {
      await serviceClient
        .from('enrollment_applications')
        .update({ status: 'rejected', rejection_reason: 'Email belongs to an existing admin account.', updated_at: new Date().toISOString() })
        .eq('id', id)
      return { error: `Cannot approve: this email (${app.email}) belongs to an admin account.` }
    }

    // Existing salesman: activate profile and approve application without touching their password
    await serviceClient
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', existingProfile.id)

    await serviceClient
      .from('enrollment_applications')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)

    revalidatePath('/admin/enrollments')
    return { data: undefined }
  }

  // Generate a secure temp password for the new user
  const tempPassword = `SA_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6).toUpperCase()}!`

  let newUserId = ''

  // Create Supabase Auth user
  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email: app.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: app.full_name, role: 'salesman' },
  })

  if (authErr) {
    return { error: `Auth user creation failed: ${authErr.message}` }
  } else {
    newUserId = authData.user.id
  }

  // Create profile â€” carry over avatar + social from application
  const { error: profileErr } = await serviceClient.from('profiles').upsert({
    id: newUserId,
    full_name: app.full_name,
    email: app.email,
    role: 'salesman',
    status: 'active',
    avatar_url: app.avatar_url || null,
    whatsapp: app.whatsapp || null,
    instagram: app.instagram || null,
    facebook: app.facebook || null,
    linkedin: app.linkedin || null,
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
    title: 'ðŸŽ‰ Your application has been approved!',
    body: `Welcome to ${SITE_NAME}, ${app.full_name}! Your login email is ${app.email} and your temporary password is: ${tempPassword}. Please change it after first login.`,
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

