"use client"

import { useEffect, useRef } from "react"

export function PushReminderPoller({ seconds = 300 }: { seconds?: number }) {
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    async function tick() {
      try {
        await fetch("/api/push/send")
      } catch {
        // silent
      }
    }

    tick()
    const id = setInterval(tick, seconds * 1000)
    return () => clearInterval(id)
  }, [seconds])

  return null
}
