'use client'

import { useState } from 'react'
import { askAi } from '@/lib/actions/ai-assist'
import { Send, Loader2, Copy, Bot, User, Check } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
}

export function AiHelpChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const handleSend = async () => {
    if (!input.trim() || cooldown || isLoading) return
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg].slice(-10)) // Keep last 5 pairs
    
    setInput('')
    setIsLoading(true)
    
    const result = await askAi(userMsg.content)
    
    setIsLoading(false)
    setCooldown(true)
    setTimeout(() => setCooldown(false), 3000)
    
    if (result.error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: `Error: ${result.error}` }
      setMessages(prev => [...prev, errorMsg].slice(-10))
    } else if (result.data) {
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: result.data }
      setMessages(prev => [...prev, aiMsg].slice(-10))
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-50 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      
      {/* Chat History */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8 space-y-4">
            <Bot className="w-12 h-12 text-brand-200" />
            <p className="text-sm max-w-sm">
              I can help you respond to difficult customers, handle objections, or craft the perfect follow-up message.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-brand-100 flex flex-shrink-0 items-center justify-center border border-brand-200">
                  <Bot className="w-4 h-4 text-brand-600" />
                </div>
              )}
              
              <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`px-5 py-3.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-gray-200 text-gray-800 rounded-tr-sm' 
                      : 'bg-brand-600 text-white rounded-tl-sm shadow-md'
                    }`}
                >
                  {msg.content}
                </div>
                
                {msg.role === 'ai' && !msg.content.startsWith('Error:') && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors border border-brand-200"
                  >
                    {copiedId === msg.id ? (
                      <><Check className="w-3.5 h-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy Response</>
                    )}
                  </button>
                )}
              </div>
              
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex flex-shrink-0 items-center justify-center border border-gray-300">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
              
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex flex-shrink-0 items-center justify-center border border-brand-200">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
            <div className="bg-white border border-gray-200 px-5 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 text-sm text-gray-500 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="Describe the customer situation or paste their message..."
            className="w-full pl-5 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || cooldown}
            className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
