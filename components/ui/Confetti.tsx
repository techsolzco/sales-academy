'use client'

import { useEffect, useRef } from 'react'

export function Confetti({ duration = 3000 }: { duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const particles: any[] = []
    const colors = ['#fde047', '#3b82f6', '#ef4444', '#10b981', '#a855f7']

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        r: Math.random() * 6 + 2,
        dx: Math.random() * 10 - 5,
        dy: Math.random() * -10 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleInc: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0
      })
    }

    let animationId: number
    let startTime = Date.now()

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, width, height)

      let stillAlive = false
      const now = Date.now()

      particles.forEach(p => {
        p.tiltAngle += p.tiltAngleInc
        p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2
        p.x += Math.sin(p.tiltAngle) * 2
        p.dy += 0.1 // gravity
        p.x += p.dx
        p.y += p.dy

        if (p.y <= height) {
          stillAlive = true
        }

        ctx.beginPath()
        ctx.lineWidth = p.r
        ctx.strokeStyle = p.color
        ctx.moveTo(p.x + p.tilt + p.r, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r)
        ctx.stroke()
      })

      if (stillAlive && now - startTime < duration + 2000) {
        animationId = requestAnimationFrame(draw)
      }
    }

    draw()

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener('resize', handleResize)

    const stopTimer = setTimeout(() => {
      cancelAnimationFrame(animationId)
    }, duration + 2000)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      clearTimeout(stopTimer)
    }
  }, [duration])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      aria-hidden="true"
    />
  )
}
