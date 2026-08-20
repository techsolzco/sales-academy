'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  id: string
  full_name: string
  email: string
}

export function DailyReportFilters({ salesmen }: { salesmen: User[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const initialUserId = searchParams.get('userId') || ''

  const [date, setDate] = useState(initialDate)
  const [userId, setUserId] = useState(initialUserId)

  const handleApply = () => {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (userId) params.set('userId', userId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input 
          type="date" 
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
        <select 
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 min-w-[200px]"
        >
          <option value="">All Students</option>
          {salesmen.map(s => (
            <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
          ))}
        </select>
      </div>
      <button 
        onClick={handleApply}
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
      >
        Apply Filters
      </button>
    </div>
  )
}
