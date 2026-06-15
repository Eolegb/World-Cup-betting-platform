"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Periodically syncs live scores and refreshes the page.
 * Runs immediately on mount, then every N seconds.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter()
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    async function tick() {
      try {
        const res = await fetch("/api/sync/live")
        const data = await res.json()
        if (!data.ok) console.warn("[AutoRefresh] Sync/live failed:", data.error)
      } catch (e) {
        console.warn("[AutoRefresh] Network error:", e)
      }
      router.refresh()
    }

    // Run immediately
    tick()

    const id = setInterval(tick, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])

  return null
}
