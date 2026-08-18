'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addTicketMessage, updateTicketStatus } from '@/lib/actions/tickets'
import { Send, Clock, User, Shield, ChevronDown } from 'lucide-react'

export interface SupportTicket {
  id: string
  subject: string
  category: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  description: string
  user_id: string
  created_at: string
  profile?: {
    full_name: string
  }
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  content: string
  created_at: string
  profile?: {
    full_name: string
    role: string
    avatar_url?: string
  }
}

interface Props {
  ticket: SupportTicket
  initialMessages: TicketMessage[]
  currentUserId: string
  currentUserRole: string
}

const statusColors = {
  open: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  'in-progress': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  resolved: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
  closed: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

export function TicketThread({ ticket, initialMessages, currentUserId, currentUserRole }: Props) {
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(ticket.status)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const isAdmin = currentUserRole === 'admin'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`ticket-${ticket.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_messages', 
        filter: `ticket_id=eq.${ticket.id}` 
      }, async (payload) => {
        // Fetch the user profile for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', payload.new.sender_id)
          .single()
          
        const newMessage = { ...payload.new, profile } as TicketMessage
        setMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev
          return [...prev, newMessage]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_tickets',
        filter: `id=eq.${ticket.id}`
      }, (payload) => {
        setCurrentStatus(payload.new.status)
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket.id])

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as SupportTicket['status']
    setCurrentStatus(newStatus)
    await updateTicketStatus(ticket.id, newStatus)
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    try {
      await addTicketMessage(ticket.id, replyContent)
      setReplyContent('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs px-2.5 py-1 rounded-md font-medium uppercase tracking-wider bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300">
              {ticket.category}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(ticket.created_at).toLocaleString()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{ticket.subject}</h2>
          {isAdmin && ticket.profile && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
              <User className="w-4 h-4" /> {ticket.profile.full_name}
            </p>
          )}
        </div>
        
        <div className="flex-shrink-0">
          {isAdmin ? (
            <div className="relative">
              <select
                value={currentStatus}
                onChange={handleStatusChange}
                className={`appearance-none pr-10 pl-4 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${statusColors[currentStatus]}`}
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            </div>
          ) : (
            <span className={`px-4 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border ${statusColors[currentStatus]}`}>
              {currentStatus}
            </span>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-900/30">
        {/* Original Ticket Description */}
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold flex-shrink-0">
            {ticket.profile?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 p-5 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{ticket.profile?.full_name || 'User'}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(ticket.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        {/* Replies */}
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId
          const isSenderAdmin = message.profile?.role === 'admin'
          
          return (
            <div key={message.id} className={`flex gap-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm ${
                isSenderAdmin ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {message.profile?.full_name?.charAt(0) || '?'}
              </div>
              
              <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 mb-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {isOwn ? 'You' : message.profile?.full_name}
                  </span>
                  {isSenderAdmin && !isOwn && (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded-md font-bold">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className={`p-4 shadow-sm text-sm whitespace-pre-wrap ${
                  isOwn 
                    ? 'bg-brand-600 text-white rounded-2xl rounded-tr-none' 
                    : isSenderAdmin
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-brand-500 dark:border-l-brand-500 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none'
                }`}>
                  {message.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      {currentStatus !== 'closed' ? (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
          <form onSubmit={handleReply} className="flex gap-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply here..."
              className="flex-1 resize-none h-12 min-h-[48px] max-h-32 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleReply(e)
                }
              }}
            />
            <button
              type="submit"
              disabled={!replyContent.trim() || isSubmitting}
              className="px-5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">Press Enter to send, Shift + Enter for new line</p>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          This ticket is closed. If you have further questions, please open a new ticket.
        </div>
      )}
    </div>
  )
}
