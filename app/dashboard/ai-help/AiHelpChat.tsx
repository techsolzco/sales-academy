'use client'

import { useState } from 'react'
import { askAi } from '@/lib/actions/ai-assist'
import { Send, Loader2, Copy, Bot, User, Check } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
}

function stripAsterisks(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()
}

function parseAiResponse(content: string): { instructions: string; clientMessage: string } | null {
  const instructionMarker = '---SALESMAN INSTRUCTIONS---'
  const clientMarker = '---CLIENT MESSAGE---'
  if (!content.includes(instructionMarker) || !content.includes(clientMarker)) return null
  const afterInstructions = content.split(instructionMarker)[1] ?? ''
  const [rawInstructions, afterClient] = afterInstructions.split(clientMarker)
  return {
    instructions: stripAsterisks(rawInstructions ?? ''),
    clientMessage: stripAsterisks(afterClient ?? ''),
  }
}

interface StructuredMessageProps {
  messageId: string
  content: string
}

function StructuredAiMessage({ messageId, content }: StructuredMessageProps) {
  const [copiedInstructions, setCopiedInstructions] = useState(false)
  const [copiedClient, setCopiedClient] = useState(false)

  const parsed = parseAiResponse(content)

  const handleCopyInstructions = () => {
    if (!parsed) return
    navigator.clipboard.writeText(parsed.instructions)
    setCopiedInstructions(true)
    setTimeout(() => setCopiedInstructions(false), 2000)
  }

  const handleCopyClient = () => {
    if (!parsed) return
    navigator.clipboard.writeText(parsed.clientMessage)
    setCopiedClient(true)
    setTimeout(() => setCopiedClient(false), 2000)
  }

  if (!parsed) {
    // Fallback: plain response
    return (
      <div className="bg-brand-600 text-white px-5 py-3.5 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap leading-relaxed shadow-md">
        {stripAsterisks(content)}
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-[85%]">
      {/* Salesman instructions */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-gray-600">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
            💡 For You
          </span>
          <button
            onClick={handleCopyInstructions}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition"
          >
            {copiedInstructions ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedInstructions ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
          {parsed.instructions}
        </p>
      </div>

      {/* Client-facing message */}
      <div className="bg-emerald-600 rounded-2xl overflow-hidden shadow-md">
        <div className="flex items-center justify-between px-4 py-2 bg-emerald-700">
          <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">
            📨 Message to Send
          </span>
          <button
            onClick={handleCopyClient}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-100 hover:text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded-lg transition"
          >
            {copiedClient ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedClient ? 'Copied!' : 'Copy for WhatsApp'}
          </button>
        </div>
        <p className="px-4 py-3 text-sm text-white leading-relaxed whitespace-pre-wrap">
          {parsed.clientMessage}
        </p>
      </div>
    </div>
  )
}

export function AiHelpChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || cooldown || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg].slice(-10))

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

  return (
    <div className="flex flex-col h-[680px] bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

      {/* Chat History */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-8 space-y-4">
            <Bot className="w-12 h-12 text-brand-200 dark:text-brand-800" />
            <p className="text-sm max-w-sm">
              Describe your customer situation — I&apos;ll give you coaching tips and a ready-to-send WhatsApp message.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex flex-shrink-0 items-center justify-center border border-brand-200 dark:border-brand-700">
                  <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="max-w-[75%] px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm whitespace-pre-wrap leading-relaxed bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                  {msg.content}
                </div>
              ) : (
                <StructuredAiMessage messageId={msg.id} content={msg.content} />
              )}

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
            placeholder="Describe the customer situation or paste their message..."
            className="w-full pl-5 pr-14 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-700 transition-all shadow-inner"
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
