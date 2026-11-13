'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing } from 'lucide-react'
import { sendDueReminders } from '@/lib/actions/reminders'

// ─── "Send due reminders" button (audit §3 #7) ──────────────────────────────
// Calls sendDueReminders() (admin only): bell notifications for every
// assignment due within the next 24h, deduped per user + assignment.
// Shows the { reminded, skipped } result; no page reload needed.

export function SendDueRemindersButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  const handleClick = () => {
    setResult(null)
    startTransition(async () => {
      const res = await sendDueReminders()
      if (res.error || !res.data) {
        setResult(`Failed: ${res.error ?? 'Unknown error'}`)
        return
      }
      const { reminded, skipped } = res.data
      setResult(
        `Sent ${reminded} reminder${reminded === 1 ? '' : 's'}` +
          (skipped > 0 ? `, ${skipped} skipped (already reminded in the last 24h)` : '') +
          '.',
      )
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors text-sm disabled:opacity-60"
      >
        <BellRing className="w-4 h-4" />
        {isPending ? 'Sending…' : 'Send due reminders'}
      </button>
      {result && <p className="text-sm text-gray-600 dark:text-gray-400">{result}</p>}
    </div>
  )
}
