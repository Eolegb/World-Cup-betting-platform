"use client"

import { useEffect, useState } from "react"

// Lightweight confetti effect using canvas
export function ConfettiOverlay({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<{ x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[]>([])

  useEffect(() => {
    if (trigger <= 0) return
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF4081", "#00E676", "#FFAB40"]
    const newParticles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      life: 1,
    }))
    setParticles(newParticles)

    const interval = setInterval(() => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            life: p.life - 0.008,
          }))
          .filter((p) => p.life > 0)
        return next
      })
    }, 16)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      setParticles([])
    }, 4000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1 : 1.8),
            backgroundColor: p.color,
            opacity: p.life,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  )
}
