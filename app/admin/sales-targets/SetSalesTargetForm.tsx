'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setSalesTarget } from '@/lib/actions/sales-targets'

export function SetSalesTargetForm({
  users,
  month,
}: {
  users: { id: string; full_name: string | null }[]
  month: string
}) {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [targetMonth, setTargetMonth] = useState(month)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    const parsed = parseInt(amount, 10)
    if (!userId) return setError('Select an intern')
    if (!Number.isInteger(parsed) || parsed <= 0) return setError('Amount must be a positive whole number of PKR')
    startTransition(async () => {
      const res = await setSalesTarget(userId, targetMonth, parsed)
      if (res.error) {
        setError(res.error)
        return
      }
      setOk(`Target set: Rs ${parsed.toLocaleString()} for ${targetMonth}`)
      setAmount('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 mb-6">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Set monthly target</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
        >
          <option value="">Select intern…</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
          ))}
        </select>
        <input
          type="month"
          value={targetMonth}
          onChange={e => setTargetMonth(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
        />
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Target amount (PKR)"
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition"
        >
          {isPending ? 'Saving…' : 'Set Target'}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p> : null}
      {ok ? <p className="text-sm text-green-600 dark:text-green-400 mt-3">{ok}</p> : null}
    </form>
  )
}
