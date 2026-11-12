'use server'
import { randomBytes } from 'crypto'
import { SITE_NAME } from '@/lib/config/site'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { ActionResult, EnrollmentApplication } from '@/types'
import {
  sendAdminNewApplicationEmail,
  sendAdminNewSalesmanEmail,
  sendRejectionEmail,
  sendWelcomeEmail,
} from '@/lib/email'
import { isEmailVerified } from '@/lib/actions/email-otp'

/**
 * Registration — APPROVAL model (audit B1/S2).
 *
 * A new intern only ever APPLIES here: the application is inserted as
 * `pending` and nothing else is created — no Auth user, no active profile,
 * no sign-in. An admin approves in approveApplication, which is the ONLY
 * place an Auth user + active profile is created. The applicant's email
 * must first be proven with a 6-digit OTP (lib/actions/email-otp.ts);
 * submit enforces that server-side, so the form UI is not the gate.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type ServiceClient = ReturnType<typeof getServiceClient>

export interface EnrollmentInput {
  full_name: string
  email: string
  phone?: string
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

/** What approveApplication returns on success (B9 — was `{ data: undefined }`). */
export interface ApproveApplicationResult {
  /** Admin-generated temporary password — present only for a newly created account. */
  tempPassword?: string
  userId: string
  email: string
  /** True when the applicant already had an account (no new password issued). */
  existingAccount: boolean
}

/**
 * 24-char URL-safe temporary password from a CSPRNG (audit S10).
 * randomBytes(18) = 144 bits of entropy; base64url keeps it paste-safe.
 * Never Math.random.
 */
function generateTempPassword(): string {
  return randomBytes(18).toString('base64url')
}

/** Find an Auth user by email via the admin API (paged listUsers search). */
async function findAuthUserByEmail(
  serviceClient: ServiceClient,
  email: string
): Promise<{ id: string; email?: string } | null> {
  const cleanEmail = email.trim().toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error || !data) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === cleanEmail)
    if (found) return { id: found.id, email: found.email }
    if (data.users.length < 1000) break
  }
  return null
}

/**
 * Shared tail of approval once an Auth user id exists: upsert the active
 * profile, mark the application approved, notify the user in-app, and email
 * the temp password to the applicant + the "new intern joined" mail to the
 * admins. Emails are best-effort and never fail the approval — the admin
 * still receives the temp password in the return value as a fallback
 * (e.g. to share on WhatsApp).
 */
async function completeApproval(
  serviceClient: ServiceClient,
  app: EnrollmentApplication & { avatar_url?: string | null; whatsapp?: string | null; instagram?: string | null; facebook?: string | null; linkedin?: string | null },
  userId: string,
  tempPassword: string
): Promise<ActionResult<ApproveApplicationResult>> {
  const { error: profileErr } = await serviceClient.from('profiles').upsert({
    id: userId,
    full_name: app.full_name,
    email: app.email,
    role: 'salesman',
    status: 'active',
    avatar_url: app.avatar_url || null,
    phone: app.phone || null,
    whatsapp: app.whatsapp || null,
    instagram: app.instagram || null,
    facebook: app.facebook || null,
    linkedin: app.linkedin || null,
  })

  if (profileErr) {
    // Application stays `pending`: retry recovers via the B13 path below
    // (existing Auth user found by email, new temp password set on it).
    return { error: `Profile creation failed: ${profileErr.message}` }
  }

  const { error: approveErr } = await serviceClient
    .from('enrollment_applications')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', app.id)

  if (approveErr) {
    return { error: `Could not mark application approved: ${approveErr.message}` }
  }

  // Notify the new user in-app (they can now log in and read it).
  await serviceClient.from('notifications').insert({
    user_id: userId,
    title: '🎉 Your application has been approved!',
    body: `Welcome to ${SITE_NAME}, ${app.full_name}! Your login email is ${app.email}. Your temporary password was emailed to you — please change it after first login.`,
    type: 'enrollment',
    link: '/dashboard',
  })

  // Emails (best-effort: never fail the approval).
  try {
    await sendWelcomeEmail({
      fullName: app.full_name,
      email: app.email,
      tempPassword,
    })
    const { data: admins } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
    const adminEmails = (admins ?? [])
      .map((a) => a.email)
      .filter((e): e is string => !!e)
    await sendAdminNewSalesmanEmail({
      fullName: app.full_name,
      email: app.email,
      phone: app.phone || null,
      adminEmails,
    })
  } catch (err) {
    console.error('Approval email error:', err)
  }

  revalidatePath('/admin/enrollments')
  return {
    data: { tempPassword, userId, email: app.email, existingAccount: false },
  }
}

export async function submitEnrollmentApplication(
  input: EnrollmentInput
): Promise<ActionResult> {
  const serviceClient = getServiceClient()
  const cleanEmail = input.email.trim().toLowerCase()
  const fullName = input.full_name.trim()

  // Server-side OTP gate (audit S2/B1): the email must have been verified
  // with a 6-digit code before an application may be submitted.
  if (!(await isEmailVerified(cleanEmail))) {
    return { error: 'Please verify your email with the 6-digit code before submitting your application.' }
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
    if (existingApp.status === 'pending') {
      return { error: 'You already have an application pending review. Our team will get back to you within 1–2 business days.' }
    }
    return { error: 'An account with this email already exists. Please log in or use a different email.' }
  }

  // Insert the application as `pending` ONLY (audit B1/S2/B12). No Auth user,
  // no profile, no sign-in happens here. Any failure is a real error —
  // never silent success.
  const { data: insertedApp, error: appErr } = await serviceClient
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
      status: 'pending',
      email_verified_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (appErr || !insertedApp) {
    return { error: `Application could not be submitted: ${appErr?.message ?? 'unknown error'}. Please try again.` }
  }

  // Notify admins in-app that an application is pending review.
  const { data: admins } = await serviceClient
    .from('profiles')
    .select('id, email')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifs = admins.map((a) => ({
      user_id: a.id,
      title: `New enrollment application: ${fullName}`,
      body: `${cleanEmail} applied to join ${SITE_NAME}. Review the application to approve or reject it.`,
      type: 'enrollment',
      link: '/admin/enrollments',
    }))
    const { error: notifErr } = await serviceClient.from('notifications').insert(notifs)
    if (notifErr) {
      console.error('Admin notification error on enrollment application:', notifErr)
    }
  }

  // Email the admins "new application pending review" (best-effort).
  // The welcome email does NOT fire here — it fires on approval.
  try {
    const adminEmails = (admins ?? [])
      .map((a) => a.email)
      .filter((e): e is string => !!e)
    await sendAdminNewApplicationEmail({
      fullName,
      email: cleanEmail,
      phone: input.phone?.trim() || null,
      adminEmails,
    })
  } catch (err) {
    console.error('Application admin email error:', err)
  }

  return { data: undefined }
}

export async function approveApplication(
  id: string
): Promise<ActionResult<ApproveApplicationResult>> {
  const supabase = await createClient()

  // Require admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  const serviceClient = getServiceClient()

  // Fetch application (service client, consistent with the rest of this file)
  const { data: app, error: fetchErr } = await serviceClient
    .from('enrollment_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !app) return { error: fetchErr?.message ?? 'Application not found' }
  // Status guard (audit B14 pattern): only a `pending` application can be approved.
  if (app.status !== 'pending') return { error: `Application has already been ${app.status}.` }
  // Only ever approve a verified email: the OTP check stamps
  // email_verified_at at submit time. Applications from before OTP existed
  // (null) cannot be approved — the applicant must re-apply with a verified email.
  if (!app.email_verified_at) {
    return { error: 'Cannot approve: this applicant’s email was never verified. Please ask them to re-apply using email verification.' }
  }

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

    // Existing salesman: activate profile and approve application without
    // touching their password (they already have credentials).
    const { error: activateErr } = await serviceClient
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', existingProfile.id)
    if (activateErr) return { error: `Could not activate existing profile: ${activateErr.message}` }

    const { error: approveErr } = await serviceClient
      .from('enrollment_applications')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (approveErr) return { error: `Could not mark application approved: ${approveErr.message}` }

    revalidatePath('/admin/enrollments')
    return { data: { userId: existingProfile.id, email: app.email, existingAccount: true } }
  }

  // Generate a secure temp password for the new user (audit S10)
  const tempPassword = generateTempPassword()

  // Create Supabase Auth user (email_confirm: true — the admin has approved,
  // and the email was already proven by OTP, so no confirmation click needed)
  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email: app.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: app.full_name, role: 'salesman' },
  })

  if (authErr) {
    // B13 retry path: a previous approve may have created the Auth user but
    // failed before the profile was upserted, leaving the application stuck
    // in `pending`. Link to that existing user instead of failing: generate
    // a NEW temp password, set it on the existing user, and complete the
    // approval for that user id.
    const alreadyRegistered =
      authErr.message.toLowerCase().includes('already') ||
      authErr.message.toLowerCase().includes('registered')
    if (!alreadyRegistered) {
      return { error: `Auth user creation failed: ${authErr.message}` }
    }
    const existingUser = await findAuthUserByEmail(serviceClient, app.email)
    if (!existingUser) {
      return { error: `Auth user creation failed: ${authErr.message} (and no existing user with this email could be found to recover).` }
    }
    const retryPassword = generateTempPassword()
    const { error: resetErr } = await serviceClient.auth.admin.updateUserById(
      existingUser.id,
      { password: retryPassword }
    )
    if (resetErr) {
      return { error: `Could not set a password on the existing account: ${resetErr.message}` }
    }
    return completeApproval(serviceClient, app, existingUser.id, retryPassword)
  }

  return completeApproval(serviceClient, app, authData.user.id, tempPassword)
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

  // Service client throughout (audit B14: approve used the service client,
  // reject used the anon client — now aligned).
  const serviceClient = getServiceClient()

  // Fetch application to get applicant info — a non-existent id is an error.
  const { data: app, error: fetchErr } = await serviceClient
    .from('enrollment_applications')
    .select('full_name, email, status')
    .eq('id', id)
    .single()

  if (fetchErr || !app) return { error: fetchErr?.message ?? 'Application not found' }
  // Status guard (audit B14): only a `pending` application can be rejected.
  if (app.status !== 'pending') return { error: `Application has already been ${app.status}.` }

  const { error } = await serviceClient
    .from('enrollment_applications')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Notify the applicant by email (best-effort: never fails the reject).
  try {
    await sendRejectionEmail({
      fullName: app.full_name,
      email: app.email,
      reason: reason || null,
    })
  } catch (err) {
    console.error('Rejection email error:', err)
  }

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
