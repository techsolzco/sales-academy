'use client'

import { PlusCircle, Search } from 'lucide-react'
import type { Conversation } from '@/types'

export interface ConversationWithMeta extends Conversation {
  otherUser?: {
    id: string
    full_name: string
    avatar_url?: string | null
    role?: string
  }
  lastMessage?: { content: string; created_at: string }
  unreadCount?: number
}

// Derive the 'other user' from a conversation given the current user id
export function getOtherUser(conv: Conversation, currentUserId: string) {
  if (conv.participant_a === currentUserId) return conv.profile_b
  return conv.profile_a
}

interface Props {
  conversations: ConversationWithMeta[]
  currentUserId: string
  selectedId: string | null
  onSelect: (id: string, otherUser: NonNullable<ConversationWithMeta['otherUser']>) => void
  onNewChat?: () => void
  isAdmin?: boolean
}

export function ConversationList({ conversations, currentUserId, selectedId, onSelect, onNewChat, isAdmin }: Props) {
  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Messages</h2>
        {isAdmin && onNewChat && (
          <button 
            onClick={onNewChat}
            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="New Chat"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
            <Search className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conversations.map(conv => {
              if (!conv.otherUser) return null
              const isSelected = selectedId === conv.id
              
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id, conv.otherUser!)}
                  className={`w-full text-left p-4 transition-colors hover:bg-gray-50 flex items-center gap-3 ${
                    isSelected ? 'bg-brand-50/50 hover:bg-brand-50/50 relative' : ''
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
                  )}
                  
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0 border border-brand-200">
                      {conv.otherUser.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt={conv.otherUser.full_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        conv.otherUser.full_name.charAt(0)
                      )}
                    </div>
                    {conv.unreadCount && conv.unreadCount > 0 ? (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">
                        {conv.unreadCount}
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`font-semibold truncate ${isSelected ? 'text-brand-900' : 'text-gray-900'}`}>
                        {conv.otherUser.full_name}
                      </h4>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                          {new Date(conv.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    
                    {conv.lastMessage ? (
                      <p className={`text-xs truncate ${conv.unreadCount ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {conv.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No messages yet</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
