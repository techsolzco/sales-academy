'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchConversations, getOrCreateConversation, fetchMessages, fetchAdminUsers } from '@/lib/actions/chat'
import { ConversationList, ConversationWithMeta } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import type { DirectMessage } from '@/types'
import { MessageSquarePlus, Loader2 } from 'lucide-react'

export default function DashboardChatPage() {
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<NonNullable<ConversationWithMeta['otherUser']> | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isChatLoading, setIsChatLoading] = useState(false)

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
    const msgs = await fetchMessages(id)
    setMessages(msgs)
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unreadCount: 0 } : c
    ))
  }

  const handleChatWithAdmin = async () => {
    setIsChatLoading(true)
    try {
      const admins = await fetchAdminUsers()
      if (!admins.length) {
        alert('No admin available at the moment.')
        return
      }
      const result = await getOrCreateConversation(admins[0].id)
      if (result.error || !result.data) {
        alert('Could not start conversation. Please try again.')
        return
      }
      const convId = result.data.conversationId
      const convs = await fetchConversations() as ConversationWithMeta[]
      setConversations(convs)
      const newConv = convs.find(c => c.id === convId)
      if (newConv?.otherUser) {
        await handleSelectConversation(newConv.id, newConv.otherUser)
      } else {
        // Fallback: set selectedId directly so ChatWindow renders
        setSelectedId(convId)
        setSelectedUser({ id: admins[0].id, full_name: admins[0].full_name || 'Admin', avatar_url: null })
      }
    } catch (err) {
      console.error('Failed to start chat with admin', err)
    } finally {
      setIsChatLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
      {/* Left panel: conversation list OR empty state */}
      <div className={`${selectedId ? 'hidden md:block' : 'block'} w-full md:w-1/3 h-full`}>
        {conversations.length === 0 ? (
          <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center justify-center text-center">
            <MessageSquarePlus className="w-12 h-12 text-brand-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Need Help?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Start a direct conversation with an admin for personalized support.
            </p>
            <button
              onClick={handleChatWithAdmin}
              disabled={isChatLoading}
              className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition w-full shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isChatLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isChatLoading ? 'Starting...' : 'Chat with Admin'}
            </button>
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            currentUserId={currentUserId}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      {/* Right panel: chat window */}
      <div className={`${!selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 h-full`}>
        <ChatWindow
          conversationId={selectedId}
          currentUserId={currentUserId}
          otherUser={selectedUser}
          initialMessages={messages}
        />
      </div>
    </div>
  )
}
