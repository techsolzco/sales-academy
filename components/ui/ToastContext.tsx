'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timerMap.current.delete(id)
    }, 3500)
    timerMap.current.set(id, timer)
  }, [])

  const removeToast = (id: string) => {
    const timer = timerMap.current.get(id)
    if (timer) clearTimeout(timer)
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium cursor-pointer
              animate-in slide-in-from-right-4 fade-in duration-300
              ${
                t.type === 'success' ? 'bg-emerald-600 text-white' :
                t.type === 'error' ? 'bg-red-600 text-white' :
                'bg-gray-800 text-white'
              }`}
          >
            <span>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { toast: { success: console.log, error: console.error, info: console.log } }
  return ctx
}
