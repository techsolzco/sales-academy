'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { markWelcomeSeen } from '@/lib/actions/app-settings'

export function WelcomeModal({ 
  template, 
  name,
  shouldShow
}: { 
  template: string
  name: string
  shouldShow: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check localStorage first to prevent flash if DB is out of sync or column is missing
    const hasSeen = localStorage.getItem('has_seen_welcome') === 'true'
    if (shouldShow && !hasSeen) {
      setIsOpen(true)
    }
  }, [shouldShow])

  const handleClose = async () => {
    setIsOpen(false)
    localStorage.setItem('has_seen_welcome', 'true')
    try {
      await markWelcomeSeen()
    } catch (e) {
      // Ignore if column doesn't exist yet
    }
  }

  if (!isOpen) return null

  const message = template.replace(/{name}/g, name.split(' ')[0])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 relative"
      >
        <div className="h-32 bg-gradient-to-br from-brand-400 to-brand-600 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner relative z-10 border border-white/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome Aboard! 🚀</h2>
          <p className="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-lg transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  )
}
