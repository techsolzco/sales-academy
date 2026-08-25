'use client'

import { useState, useRef, useEffect } from 'react'
import { chatWithEnglishTutor } from '@/lib/actions/english-practice'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { AiText, CopyButton } from '@/components/ai/AiText'

interface Message {
  id: string
  role: 'user' | 'model'
  text: string
}

export function EnglishPracticeChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input }

    // Capture history BEFORE adding current message — these are prior turns
    // The current message is passed separately to chatWithEnglishTutor
    const history = messages.map(m => ({ role: m.role, text: m.text }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const result = await chatWithEnglishTutor(userMsg.text, history)

      setIsLoading(false)

      if (result.error) {
        const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: `⚠️ ${result.error}` }
        setMessages(prev => [...prev, errorMsg])
      } else if ('data' in result && result.data) {
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: result.data as string }
        setMessages(prev => [...prev, aiMsg])
      }
    } catch (err) {
      setIsLoading(false)
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: `⚠️ Network error: The server took too long to respond. Please try again.` }
      setMessages(prev => [...prev, errorMsg])
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      
      {/* Chat History */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-8 space-y-4">
            <Bot className="w-12 h-12 text-brand-200 dark:text-brand-800" />
            <p className="text-sm max-w-sm">
              Hello! I am your English tutor. What would you like to talk about today?
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex flex-shrink-0 items-center justify-center border border-brand-200 dark:border-brand-700">
                  <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
              )}
              
              <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tr-sm whitespace-pre-wrap break-words'
                      : 'bg-brand-600 text-white rounded-tl-sm shadow-md [&_mark]:bg-white/20 [&_mark]:text-white'
                    }`}
                >
                  {msg.role === 'user'
                    ? msg.text
                    : <AiText text={msg.text} showCopy copyLabel="Copy" copyVariant="dark" />
                  }
                </div>
              </div>
              
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex flex-shrink-0 items-center justify-center border border-gray-300 dark:border-gray-600">
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
              )}
              
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex flex-shrink-0 items-center justify-center border border-brand-200 dark:border-brand-700">
              <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="Type your message..."
            className="w-full pl-5 pr-14 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-700 transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
