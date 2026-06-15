"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Periodically refreshes server components and syncs live scores.
 * Calls /api/sync/live to update match status/scores, then refreshes the page.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    async function tick() {
      try {
        await fetch("/api/sync/live")
      } catch { /* ignore */ }
      router.refresh()
    }
    tick()
    const id = setInterval(tick, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
