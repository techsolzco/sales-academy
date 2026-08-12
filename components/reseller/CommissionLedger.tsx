'use client'

import { Commission } from '@/lib/actions/reseller'

export function CommissionLedger({
  commissions,
  totalPaid,
  totalPending
}: {
  commissions: Commission[]
  totalPaid: number
  totalPending: number
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Total Earned</span>
          <span className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Pending</span>
          <span className="text-3xl font-bold text-amber-500">${totalPending.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">Commission History</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No commission records yet</div>
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
