'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage, markMessagesRead } from '@/lib/actions/chat'
import { Send, User } from 'lucide-react'
import type { DirectMessage } from '@/types'

interface Props {
  conversationId: string | null
  currentUserId: string
  otherUser: { id: string; full_name: string; avatar_url?: string | null; role?: string } | null
  initialMessages: DirectMessage[]
}

export function ChatWindow({ conversationId, currentUserId, otherUser, initialMessages }: Props) {
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages, conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!conversationId) return

    // Mark as read on mount
    markMessagesRead(conversationId)

    const supabase = createClient()
    const channel = supabase.channel(`chat-${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
        const newMsg = payload.new as DirectMessage
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        
        // If it's not our message, mark it as read immediately while viewing
        if (newMsg.sender_id !== currentUserId) {
          markMessagesRead(conversationId)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversationId) return

    const tempId = `temp-${Date.now()}`
    const content = newMessage.trim()
    setNewMessage('')
    
    // Optimistic UI update
    setMessages(prev => [
      ...prev, 
      {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        created_at: new Date().toISOString(),
        read: false
      }
    ])

    setIsSubmitting(true)
    try {
      await sendMessage(conversationId, content)
    } catch (err) {
      console.error('Failed to send message', err)
      // Remove optimistic message if failed
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!conversationId || !otherUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border border-gray-100 text-gray-400">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
          <User className="w-8 h-8 text-gray-300" />
        </div>
        <p className="font-medium text-gray-500">Select a conversation to start chatting</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white z-10 shadow-sm relative">
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
          {otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt={otherUser.full_name} className="w-full h-full rounded-full object-cover" />
          ) : (
            otherUser.full_name.charAt(0)
          )}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 leading-tight">{otherUser.full_name}</h3>
          {otherUser.role && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
              {otherUser.role}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                isOwn 
                  ? 'bg-brand-600 text-white rounded-tr-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${otherUser.full_name.split(' ')[0]}...`}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSubmitting}
            className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
