'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export function WhatsAppButton() {
  // Start position: bottom-right area
  const [pos, setPos] = useState({ x: -1, y: -1 }) // -1 = not yet initialized
  const [dragging, setDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const btnRef = useRef<HTMLAnchorElement>(null)

  // Initialize position to bottom-left (away from send button which is bottom-right)
  useEffect(() => {
    const size = 48
    const margin = 16
    setPos({
      x: margin,
      y: window.innerHeight - size - margin - 72, // above mobile nav
    })
  }, [])

  const clamp = useCallback((x: number, y: number) => {
    const size = 48
    const maxX = window.innerWidth - size - 4
    const maxY = window.innerHeight - size - 4
    return {
      x: Math.max(4, Math.min(x, maxX)),
      y: Math.max(4, Math.min(y, maxY)),
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    setDragging(true)
    setHasDragged(false)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setHasDragged(true)
    setPos(clamp(dragStart.current.px + dx, dragStart.current.py + dy))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragStart.current = null
    setDragging(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (hasDragged) {
      e.preventDefault()
      setHasDragged(false)
    }
  }

  if (pos.x === -1) return null // not yet mounted on client

  return (
    <a
      ref={btnRef}
      href="https://wa.me/923107902212?text=Hi%2C+I+need+help+with+the+Sales+Academy+platform."
      target="_blank"
      rel="noreferrer"
      title="Chat with us on WhatsApp"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
      className={`
        fixed z-50 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center
        shadow-lg select-none
        ${dragging ? 'scale-110 shadow-2xl cursor-grabbing ring-2 ring-green-300' : 'cursor-grab hover:scale-105 hover:bg-green-600'}
        transition-shadow duration-150
      `}
    >
      {/* Pulse ring - only when not dragging */}
      {!dragging && (
        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60 pointer-events-none" />
      )}

      {/* WhatsApp icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        fill="currentColor"
        className="text-white relative z-10"
        viewBox="0 0 16 16"
      >
        <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
      </svg>
    </a>
  )
}
