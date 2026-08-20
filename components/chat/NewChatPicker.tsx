'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { getActiveSalesmen, getOrCreateConversation } from '@/lib/actions/chat'

interface Salesman {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
}

export function NewChatPicker({ 
  onCancel, 
  onConversationStart 
}: { 
  onCancel: () => void
  onConversationStart: (conversationId: string, otherUser: any) => void 
}) {
  const [salesmen, setSalesmen] = useState<Salesman[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      const data = await getActiveSalesmen()
      setSalesmen(data)
      setIsLoading(false)
    }
    fetchUsers()
  }, [])

  const filtered = salesmen.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleStart = async (user: Salesman) => {
    setIsStarting(true)
    const result = await getOrCreateConversation(user.id)
    setIsStarting(false)
    if (result.data) {
      onConversationStart(result.data.conversationId, user)
    } else {
      alert(result.error || 'Failed to start conversation')
    }
  }

  return (
    <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">New Conversation</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 font-medium text-sm">
          Cancel
        </button>
      </div>
      
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active users found matching your search.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <button
                key={user.id}
                onClick={() => handleStart(user)}
                disabled={isStarting}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-colors border border-transparent hover:border-brand-100 text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.full_name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{user.full_name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
