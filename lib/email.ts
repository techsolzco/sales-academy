/**
 * Registration emails via Resend (server-only).
 *
 * Env vars (Hostinger > Academy app > Environment Variables):
 *   RESEND_API_KEY — Resend API key (account "techsolzco"; the existing
 *     "Prowala-website" key works, or create a dedicated "Academy" key).
 *   EMAIL_FROM     — sender address on a verified Resend domain, e.g.
 *     "Academy ProWala <academy@prowala.com>".
 *     Default below assumes prowala.com (verified 2026-10-17). If the
 *     sender domain is ever changed to sherazakram.com, set EMAIL_FROM
 *     in hPanel — no code change needed.
 *
 * Every send is best-effort: a missing key or a Resend error is logged
 * and NEVER fails the registration that triggered it.
 */
import { Resend } from 'resend'
import { SITE_NAME, SITE_URL, getWhatsAppUrl } from '@/lib/config/site'

const EMAIL_FROM =
  process.env.EMAIL_FROM ?? 'Academy ProWala <academy@prowala.com>'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY is not set — email skipped')
    return null
  }
  return new Resend(key)
}

interface SendResult {
  ok: boolean
  skipped?: boolean
  id?: string
}

async function sendEmail(opts: {
  to: string[]
  subject: string
  html: string
  text: string
}): Promise<SendResult> {
  const resend = getResend()
  if (!resend) return { ok: false, skipped: true }
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false }
    }
    return { ok: true, id: data?.id }
  } catch (err) {
    console.error('[email] send failed:', err)
    return { ok: false }
  }
}

/** Welcome email to the newly approved intern.
 *
 * Fires on APPROVAL only (never on application submit) — the account does
 * not exist until an admin approves, so this is the first moment the
 * applicant has credentials. Includes the admin-generated temporary
 * password and the login link. Best-effort: never fails the approval. */
export async function sendWelcomeEmail(input: {
  fullName: string
  email: string
  tempPassword: string
  loginUrl?: string
}): Promise<SendResult> {
  const loginUrl = input.loginUrl ?? `${SITE_URL}/auth/login`
  const subject = `Welcome to ${SITE_NAME} — your account is approved`
  const html = `
    <p>Assalam-o-Alaikum ${input.fullName},</p>
    <p>Good news — your application to <strong>${SITE_NAME}</strong> has been approved! Your account is ready — you can log in right now and start your training.</p>
    <p><a href="${loginUrl}">Log in to your training portal</a></p>
    <p>Your login email is: <strong>${input.email}</strong><br>
    Your temporary password is: <strong>${input.tempPassword}</strong></p>
    <p>Please change your password after your first login.</p>
    <p>If you need any help, message us on WhatsApp: <a href="${getWhatsAppUrl()}">${getWhatsAppUrl()}</a></p>
    <p>— Team ${SITE_NAME}</p>
  `
  const text = `Assalam-o-Alaikum ${input.fullName},\n\nGood news — your application to ${SITE_NAME} has been approved! Your account is ready — log in here: ${loginUrl}\n\nYour login email is: ${input.email}\nYour temporary password is: ${input.tempPassword}\n\nPlease change your password after your first login.\n\nIf you need any help, message us on WhatsApp: ${getWhatsAppUrl()}\n\n— Team ${SITE_NAME}`
  return sendEmail({ to: [input.email], subject, html, text })
}

/** One-time 6-digit email-verification code for the enrollment form.
 * Distinct from the welcome email: this only proves the applicant owns
 * the address, before the application is submitted. Never contains any
 * password or login link. */
export async function sendEmailOtp(input: {
  email: string
  code: string
  fullName?: string
  expiresInMinutes?: number
}): Promise<SendResult> {
  const minutes = input.expiresInMinutes ?? 10
  const greeting = input.fullName ? `Assalam-o-Alaikum ${input.fullName},` : 'Assalam-o-Alaikum,'
  const subject = `Your ${SITE_NAME} verification code`
  const html = `
    <p>${greeting}</p>
    <p>Your email verification code for <strong>${SITE_NAME}</strong> is:</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${input.code}</p>
    <p>This code expires in <strong>${minutes} minutes</strong>. If you did not request this code, please ignore this email.</p>
    <p>— Team ${SITE_NAME}</p>
  `
  const text = `${greeting}\n\nYour email verification code for ${SITE_NAME} is: ${input.code}\n\nThis code expires in ${minutes} minutes. If you did not request this code, please ignore this email.\n\n— Team ${SITE_NAME}`
  return sendEmail({ to: [input.email], subject, html, text })
}

/** "New application pending review" email to every admin.
 * Fires on application SUBMIT (not on approval) so the review queue is
 * not silent. Reuses the same admin-recipient path as
 * sendAdminNewSalesmanEmail. */
export async function sendAdminNewApplicationEmail(input: {
  fullName: string
  email: string
  phone?: string | null
  adminEmails: string[]
}): Promise<SendResult> {
  if (input.adminEmails.length === 0) return { ok: false, skipped: true }
  const subject = `New enrollment application pending review: ${input.fullName}`
  const html = `
    <p>A new enrollment application is waiting for review on <strong>${SITE_NAME}</strong>.</p>
    <p>Name: <strong>${input.fullName}</strong><br>
    Email: <strong>${input.email}</strong><br>
    Phone: <strong>${input.phone ?? '—'}</strong></p>
    <p>The applicant's email has been verified with a one-time code.</p>
    <p><a href="${SITE_URL}/admin/enrollments">Review the application in the admin panel</a></p>
  `
  const text = `A new enrollment application is waiting for review on ${SITE_NAME}.\n\nName: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone ?? '—'}\n\nThe applicant's email has been verified with a one-time code.\n\nReview the application in the admin panel: ${SITE_URL}/admin/enrollments`
  return sendEmail({ to: input.adminEmails, subject, html, text })
}

/** Rejection email to the applicant. Best-effort: never fails the reject. */
export async function sendRejectionEmail(input: {
  fullName: string
  email: string
  reason?: string | null
}): Promise<SendResult> {
  const subject = `Your ${SITE_NAME} application — update`
  const reasonLine = input.reason
    ? `<p>Reason given by our team: ${input.reason}</p>`
    : ''
  const reasonText = input.reason ? `\nReason given by our team: ${input.reason}\n` : ''
  const html = `
    <p>Assalam-o-Alaikum ${input.fullName},</p>
    <p>Thank you for applying to <strong>${SITE_NAME}</strong>. Unfortunately, your application has not been approved at this time.</p>
    ${reasonLine}
    <p>You are welcome to apply again in the future. If you have any questions, message us on WhatsApp: <a href="${getWhatsAppUrl()}">${getWhatsAppUrl()}</a></p>
    <p>— Team ${SITE_NAME}</p>
  `
  const text = `Assalam-o-Alaikum ${input.fullName},\n\nThank you for applying to ${SITE_NAME}. Unfortunately, your application has not been approved at this time.${reasonText}\nYou are welcome to apply again in the future. If you have any questions, message us on WhatsApp: ${getWhatsAppUrl()}\n\n— Team ${SITE_NAME}`
  return sendEmail({ to: [input.email], subject, html, text })
}

/** "New intern joined" email to every admin. */
export async function sendAdminNewSalesmanEmail(input: {
  fullName: string
  email: string
  phone?: string | null
  adminEmails: string[]
}): Promise<SendResult> {
  if (input.adminEmails.length === 0) return { ok: false, skipped: true }
  const subject = `New intern joined: ${input.fullName}`
  const html = `
    <p>A new intern has joined <strong>${SITE_NAME}</strong>.</p>
    <p>Name: <strong>${input.fullName}</strong><br>
    Email: <strong>${input.email}</strong><br>
    Phone: <strong>${input.phone ?? '—'}</strong></p>
    <p><a href="${SITE_URL}/admin/salesmen">View in the admin panel</a></p>
  `
  const text = `A new intern has joined ${SITE_NAME}.\n\nName: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone ?? '—'}\n\nView in the admin panel: ${SITE_URL}/admin/salesmen`
  return sendEmail({ to: input.adminEmails, subject, html, text })
}
