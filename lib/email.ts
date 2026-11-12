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

/** Welcome email to the newly registered intern. */
export async function sendWelcomeEmail(input: {
  fullName: string
  email: string
}): Promise<SendResult> {
  const loginUrl = `${SITE_URL}/auth/login`
  const subject = `Welcome to ${SITE_NAME} — your account is ready`
  const html = `
    <p>Assalam-o-Alaikum ${input.fullName},</p>
    <p>Welcome to <strong>${SITE_NAME}</strong>! Your account is ready — you can log in right now and start your training.</p>
    <p><a href="${loginUrl}">Log in to your training portal</a></p>
    <p>Your login email is: <strong>${input.email}</strong></p>
    <p>If you need any help, message us on WhatsApp: <a href="${getWhatsAppUrl()}">${getWhatsAppUrl()}</a></p>
    <p>— Team ${SITE_NAME}</p>
  `
  const text = `Assalam-o-Alaikum ${input.fullName},\n\nWelcome to ${SITE_NAME}! Your account is ready — log in here: ${loginUrl}\n\nYour login email is: ${input.email}\n\nIf you need any help, message us on WhatsApp: ${getWhatsAppUrl()}\n\n— Team ${SITE_NAME}`
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
