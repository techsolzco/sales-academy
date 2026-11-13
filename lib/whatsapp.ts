// ─── WhatsApp helpers (audit §3 #5) ─────────────────────────────────────────
// Pure helpers shared by the reminders server actions and the client
// ReminderButton. No WhatsApp API sender exists in this codebase — nudges
// are pre-filled wa.me links the admin taps (see components/layout/
// WhatsAppButton.tsx, which is only a link button).

/**
 * Normalise a free-text profile number (e.g. "+92 300 1234567",
 * "0300-1234567", "923001234567") to digits-only international format
 * for wa.me. Pakistani mobiles stored with a leading 0 become 92… .
 * Returns null when no usable digits remain.
 */
export function normalizeWhatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  // Local Pakistani mobile: 03XX… (11 digits) → 92 + rest
  if (digits.length === 11 && digits.startsWith('0')) return `92${digits.slice(1)}`
  return digits
}

/** Build the ready wa.me link for a phone + pre-filled message. */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const digits = normalizeWhatsappNumber(phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
