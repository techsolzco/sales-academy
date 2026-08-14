'use client'

import { Lock } from 'lucide-react'
import type { Badge } from '@/types'

interface Props {
  badges: { badge: Badge; earned_at: string | null }[]
}

export function BadgeGrid({ badges }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {badges.map((b, idx) => {
        const isEarned = !!b.earned_at
        return (
          <div
            key={b.badge.id || idx}
            className={`relative flex flex-col items-center p-4 rounded-2xl border text-center transition-all hover:-translate-y-1 hover:shadow-md ${
              isEarned
                ? 'bg-white border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                : 'bg-gray-50 border-gray-100 grayscale opacity-50'
            }`}
          >
            {!isEarned && (
              <div className="absolute top-2 right-2">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div className="text-4xl mb-3">{b.badge.icon}</div>
            <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">{b.badge.name}</h4>
            <p className="text-[10px] text-gray-500 line-clamp-2">{b.badge.description ?? ''}</p>
            {isEarned && b.earned_at && (
              <span className="text-[9px] font-medium text-yellow-600 mt-2 uppercase tracking-wide">
                Earned {new Date(b.earned_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
