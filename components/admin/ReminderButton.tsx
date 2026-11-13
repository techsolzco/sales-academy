'use client'

import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

// ─── WhatsApp reminder nudge (audit §3 #5) ──────────────────────────────────
// No WhatsApp API sender exists — this is a pre-filled wa.me link the
// admin taps. The phone is normalised to digits-only international
// format (see lib/whatsapp.ts); with no number the button is disabled.

export function ReminderButton({ phone, message }: { phone: string | null; message: string }) {
  const href = buildWhatsAppUrl(phone, message)

  if (!href) {
    return (
      <span
        title="This intern has no WhatsApp number on their profile"
        className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-3 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        No WhatsApp number
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      Remind on WhatsApp
    </a>
  )
}
