'use client'

import { useState, useRef, useEffect } from 'react'
import { askAi } from '@/lib/actions/ai-assist'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { AiText, CopyButton } from '@/components/ai/AiText'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
}

function parseAiResponse(content: string): { instructions: string; clientMessage: string } | null {
  const instructionMarker = '---SALESMAN INSTRUCTIONS---'
  const clientMarker = '---CLIENT MESSAGE---'
  if (!content.includes(instructionMarker) || !content.includes(clientMarker)) return null
  const afterInstructions = content.split(instructionMarker)[1] ?? ''
  const [rawInstructions, afterClient] = afterInstructions.split(clientMarker)
  return {
    instructions: rawInstructions ?? '',
    clientMessage: afterClient ?? '',
  }
}

function AiMessageBubble({ content }: { content: string }) {
  const parsed = parseAiResponse(content)

  if (!parsed) {
    // Fallback single bubble — no markers, show plain text with highlighting
    return (
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-md max-w-full break-words">
        <AiText text={content} showCopy copyLabel="Copy" copyVariant="dark" className="text-white [&_mark]:bg-white/20 [&_mark]:text-white" />
      </div>
    )
  }

  return (
    <div className="space-y-2 w-full max-w-full">
      {/* For salesman */}
      <div className="rounded-2xl rounded-tl-sm overflow-hidden shadow-sm border border-gray-100 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between px-3.5 py-2 bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            💡 For You
          </span>
          <CopyButton text={parsed.instructions} label="Copy" variant="light" />
        </div>
        <div className="px-4 py-3 text-gray-700 dark:text-gray-200">
          <AiText text={parsed.instructions} />
        </div>
      </div>

      {/* Client message */}
      <div className="rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600">
        <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-700/60">
          <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
            📨 Send to Client
          </span>
          <CopyButton text={parsed.clientMessage} label="Copy for WhatsApp" variant="dark" />
        </div>
        <div className="px-4 py-3 text-white [&_mark]:bg-white/20 [&_mark]:text-white">
          <AiText text={parsed.clientMessage} />
        </div>
      </div>
    </div>
  )
}

export function AiHelpChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!input.trim() || cooldown || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg].slice(-10))

    setInput('')
    setIsLoading(true)

    // 45s client-side deadline — server has 25s/attempt × 3 attempts = max ~90s,
    // but free-tier 429 retries with 30s backoff means it can take 60-90s total.
    // 45s catches the common single-retry hang while being generous enough for normal use.
    const CLIENT_TIMEOUT_MS = 45000
    const timeoutPromise = new Promise<{ error: string }>((resolve) =>
      setTimeout(() => resolve({ error: 'Request timed out. AI is busy — please wait a few seconds and try again.' }), CLIENT_TIMEOUT_MS)
    )

    let result
    try {
      result = await Promise.race([askAi(userMsg.content), timeoutPromise])
    } catch (err) {
      // Catch network-level Server Action failures (e.g. 504 Gateway Timeout from Hostinger)
      result = { error: 'Network error: The server took too long to respond. Please try again.' }
    }

    setIsLoading(false)
    setCooldown(true)
    setTimeout(() => setCooldown(false), 3000)

    if (result.error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: `⚠️ ${result.error}` }
      setMessages(prev => [...prev, errorMsg].slice(-10))
    } else if ('data' in result && result.data) {
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: result.data as string }
      setMessages(prev => [...prev, aiMsg].slice(-10))
    }
  }

  return (
    <div
      ref={chatRef}
      className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden"
      style={{ height: 'min(620px, calc(100svh - 220px))' }}
    >
      {/* Chat history */}
      <div className="flex-1 px-4 py-5 overflow-y-auto space-y-4 overscroll-contain">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shadow-inner">
              <Bot className="w-7 h-7 text-brand-500 dark:text-brand-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Your AI Sales Coach
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
              Describe a customer situation or objection — I&apos;ll give you coaching tips and a ready-to-send message.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/50 flex flex-shrink-0 items-center justify-center border border-brand-200 dark:border-brand-700 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                </div>
              )}

              <div className={`min-w-0 ${msg.role === 'user' ? 'max-w-[80%]' : 'flex-1 max-w-full'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed break-words shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <AiMessageBubble content={msg.content} />
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex flex-shrink-0 items-center justify-center border border-gray-300 dark:border-gray-600 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-2.5 items-start justify-start">
            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/50 flex flex-shrink-0 items-center justify-center border border-brand-200 dark:border-brand-700">
              <Bot className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-sm text-gray-400 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
              <span className="text-xs">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — always visible, never covered by FABs */}
      <div className="px-3 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-end gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm px-3 py-2.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // auto-grow
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Describe the customer situation…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none leading-relaxed min-h-[24px] max-h-[120px]"
            style={{ height: '24px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || cooldown}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
