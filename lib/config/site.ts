/**
 * Site-level branding & config — single source of truth.
 *
 * Site brand is configured here as the single source of truth.
 * To rebrand or change name, update SITE_NAME here.
 */

export const SITE_NAME = 'Academy ProWala'

export const SITE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_TAGLINE ?? 'Elevate your sales performance'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://academy.sherazakram.com'

export const SUPPORT_WHATSAPP =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '923107902212'

/** Full wa.me link for the support WhatsApp button */
export function getWhatsAppUrl(message?: string): string {
  const number = SUPPORT_WHATSAPP
  const encoded = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${encoded}`
}
