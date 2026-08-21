'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchConversations, fetchMessages } from '@/lib/actions/chat'
import { ConversationList, ConversationWithMeta } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { NewChatPicker } from '@/components/chat/NewChatPicker'
import type { DirectMessage } from '@/types'
import { Loader2 } from 'lucide-react'

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<NonNullable<ConversationWithMeta['otherUser']> | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showNewChatPicker, setShowNewChatPicker] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUserId(user.id)
      
      const convs = await fetchConversations() as ConversationWithMeta[]
      setConversations(convs)
      setIsLoading(false)
    }
    
    init()
  }, [])

  const handleSelectConversation = async (id: string, otherUser: NonNullable<ConversationWithMeta['otherUser']>) => {
    setSelectedId(id)
    setSelectedUser(otherUser)
    setShowNewChatPicker(false)
    
    // Fetch messages
    const msgs = await fetchMessages(id)
    setMessages(msgs)

    // Clear unread count locally
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, unreadCount: 0 } : c
    ))
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
      <div className={`${selectedId && !showNewChatPicker ? 'hidden md:block' : 'block'} w-full md:w-1/3 lg:w-1/4 h-full`}>
        <ConversationList
          conversations={conversations}
          currentUserId={currentUserId}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          isAdmin={true}
          onNewChat={() => setShowNewChatPicker(true)}
        />
      </div>
      
      <div className={`${!selectedId && !showNewChatPicker ? 'hidden md:block' : 'block'} w-full md:w-2/3 lg:w-3/4 h-full`}>
        {showNewChatPicker ? (
          <NewChatPicker 
            onCancel={() => setShowNewChatPicker(false)} 
            onConversationStart={async (id, user) => {
              // Add conversation to list if it doesn't exist
              setConversations(prev => {
                if (prev.some(c => c.id === id)) return prev
                return [{ id, participant_a: currentUserId, participant_b: user.id, otherUser: user, created_at: new Date().toISOString(), last_message_at: new Date().toISOString() }, ...prev]
              })
              await handleSelectConversation(id, user)
            }} 
          />
        ) : (
          <ChatWindow
            conversationId={selectedId}
            currentUserId={currentUserId}
            otherUser={selectedUser}
            initialMessages={messages}
          />
        )}
      </div>
    </div>
  )
}
