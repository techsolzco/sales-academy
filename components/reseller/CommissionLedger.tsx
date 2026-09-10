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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Total Earned</span>
          <span className="text-3xl font-bold text-green-600 dark:text-green-400">${totalPaid.toFixed(2)}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Pending</span>
          <span className="text-3xl font-bold text-amber-500 dark:text-amber-400">${totalPending.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Commission History</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No commission records yet</div>
          ) : (
            commissions.map((comm) => (
              <div key={comm.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{comm.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(comm.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">${comm.amount.toFixed(2)}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    comm.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
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
