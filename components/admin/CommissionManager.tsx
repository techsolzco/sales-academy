'use client'

import { useState } from 'react'
import { Commission, addCommission, markCommissionPaid } from '@/lib/actions/reseller'
import { Check, Plus, DollarSign } from 'lucide-react'

export function CommissionManager({
  resellerId,
  resellerName,
  commissions
}: {
  resellerId: string
  resellerName: string
  commissions: Commission[]
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !description) return
    setLoading(true)
    try {
      await addCommission(resellerId, parseFloat(amount), description)
      setAmount('')
      setDescription('')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async (id: string) => {
    await markCommissionPaid(id)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Total Paid</span>
          <span className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Total Pending</span>
          <span className="text-3xl font-bold text-amber-500">${totalPending.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Commission</h3>
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="flex-[2]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
              placeholder="e.g. Sale of Advanced Course"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition disabled:opacity-50 h-[42px]"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">Commission History</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No commissions recorded yet.</div>
          ) : (
            commissions.map((comm) => (
              <div key={comm.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <p className="font-medium text-gray-900">{comm.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(comm.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">${comm.amount.toFixed(2)}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    comm.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {comm.status.toUpperCase()}
                  </span>
                  {comm.status === 'pending' && (
                    <button
                      onClick={() => handleMarkPaid(comm.id)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Mark as Paid"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
