'use client'

import { useState } from 'react'
import { logSale } from '@/lib/actions/sales'

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-brand-500 focus:border-brand-500'

// Standalone staff widget: drop into app/dashboard/page.tsx (or any staff
// page) with <SalesLogForm /> — no props required.
export function SalesLogForm() {
  const today = new Date().toISOString().split('T')[0]

  const [productName, setProductName] = useState('')
  const [bundleName, setBundleName] = useState('')
  const [amount, setAmount] = useState('')
  const [customerRef, setCustomerRef] = useState('')
  const [saleDate, setSaleDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const amountPkr = Number(amount)
    if (!productName.trim()) {
      setMessage({ type: 'error', text: 'Product name is required.' })
      return
    }
    if (!Number.isInteger(amountPkr) || amountPkr <= 0) {
      setMessage({ type: 'error', text: 'Amount must be a positive whole number of PKR.' })
      return
    }
    if (!saleDate) {
      setMessage({ type: 'error', text: 'Sale date is required.' })
      return
    }

    setSubmitting(true)
    const result = await logSale({
      product_name: productName.trim(),
      bundle_name: bundleName.trim() || undefined,
      amount_pkr: amountPkr,
      customer_ref: customerRef.trim() || undefined,
      sale_date: saleDate,
      notes: notes.trim() || undefined,
    })
    setSubmitting(false)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      return
    }

    setMessage({ type: 'success', text: `Sale logged — Rs ${amountPkr.toLocaleString()} for ${productName.trim()}.` })
    setProductName('')
    setBundleName('')
    setAmount('')
    setCustomerRef('')
    setSaleDate(today)
    setNotes('')
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Log a Sale</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Record each sale as it happens — it shows up in your monthly total and the admin sales report.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product name *
            </label>
            <input
              type="text"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="e.g. Reel Bundle"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bundle name
            </label>
            <input
              type="text"
              value={bundleName}
              onChange={e => setBundleName(e.target.value)}
              placeholder="e.g. Bundle 2"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (PKR) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 199"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sale date *
            </label>
            <input
              type="date"
              value={saleDate}
              max={today}
              onChange={e => setSaleDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Customer ref
          </label>
          <input
            type="text"
            value={customerRef}
            onChange={e => setCustomerRef(e.target.value)}
            placeholder="e.g. customer name or order ref"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything worth remembering about this sale"
            className={inputClass}
          />
        </div>

        {message && (
          <p
            className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50"
        >
          {submitting ? 'Logging…' : 'Log Sale'}
        </button>
      </form>
    </div>
  )
}
