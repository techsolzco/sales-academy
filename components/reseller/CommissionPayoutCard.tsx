'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Commission,
  uploadCommissionProof,
} from '@/lib/actions/reseller'
import { ExternalLink, Upload, Receipt, CheckCircle2 } from 'lucide-react'

// Reseller view of commission payouts (audit §3 #6): payout status per
// commission, payment-proof upload for pending payouts, and a link to view
// the uploaded proof. The parent page passes the reseller's own
// commissions (fetched via fetchMyCommissions).
export function CommissionPayoutCard({
  commissions,
}: {
  commissions: Commission[]
}) {
  const router = useRouter()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const pendingPayouts = commissions.filter(
    (c) => (c.payout_status ?? c.status) === 'pending'
  )
  const pendingProofTotal = pendingPayouts.reduce((sum, c) => sum + c.amount, 0)

  const handleFileChange = async (
    commissionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setNotice(null)
    setUploadingId(commissionId)
    try {
      const result = await uploadCommissionProof(commissionId, file)
      if (result.error) {
        setError(result.error)
      } else {
        setNotice('Payment proof uploaded. The admin will review it before marking the payout as paid.')
        router.refresh()
      }
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand-600" /> Payouts &amp; Payment Proof
        </h3>
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
          {pendingPayouts.length} payout{pendingPayouts.length === 1 ? '' : 's'} pending
          {pendingPayouts.length > 0 ? ` · $${pendingProofTotal.toFixed(2)}` : ''}
        </span>
      </div>

      {error && (
        <div className="mx-4 mt-4 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="mx-4 mt-4 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          {notice}
        </div>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {commissions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No commission records yet
          </div>
        ) : (
          commissions.map((comm) => {
            const payoutStatus = comm.payout_status ?? comm.status
            const isPaid = payoutStatus === 'paid'
            return (
              <div
                key={comm.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{comm.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(comm.created_at).toLocaleDateString()}
                    {isPaid && comm.paid_at
                      ? ` · Paid ${new Date(comm.paid_at).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ${comm.amount.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      isPaid
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {isPaid ? 'PAYOUT PAID' : 'PAYOUT PENDING'}
                  </span>
                  {comm.proof_url ? (
                    <a
                      href={comm.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {isPaid ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      View proof
                    </a>
                  ) : (
                    !isPaid && (
                      <>
                        <input
                          ref={(el) => {
                            fileInputs.current[comm.id] = el
                          }}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileChange(comm.id, e)}
                        />
                        <button
                          type="button"
                          disabled={uploadingId === comm.id}
                          onClick={() => fileInputs.current[comm.id]?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingId === comm.id ? 'Uploading…' : 'Upload proof'}
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
        Upload a screenshot or receipt of the payment you received (PNG, JPEG or WebP, max 5 MB).
        The admin can only mark a payout as paid once your proof is attached.
      </p>
    </div>
  )
}
