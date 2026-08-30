/**
 * Site-level branding & config — single source of truth.
 *
 * To rebrand or switch domains, update these env vars in your hosting panel:
 *   NEXT_PUBLIC_SITE_NAME       — e.g. "Sales Academy" or "My Training Portal"
 *   NEXT_PUBLIC_SITE_TAGLINE    — tagline shown on login page
 *   NEXT_PUBLIC_SITE_URL        — canonical origin, e.g. https://academy.sherazakram.com
 *   NEXT_PUBLIC_SUPPORT_WHATSAPP — WhatsApp number (digits only, e.g. 923107902212)
 *
 * No defaults are hardcoded here for the production domain so there's no risk of
 * accidentally shipping the wrong domain after a subdomain move.
 */

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME ?? 'Sales Academy'

export const SITE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_TAGLINE ?? 'Elevate your sales performance'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? ''

export const SUPPORT_WHATSAPP =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '923107902212'

/** Full wa.me link for the support WhatsApp button */
export function getWhatsAppUrl(message?: string): string {
  const number = SUPPORT_WHATSAPP
  const encoded = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${encoded}`
}
