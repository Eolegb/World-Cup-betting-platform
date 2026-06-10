"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Periodically refreshes server components so live scores/bets update without a
 * manual reload. Polling is client-side router.refresh() only — it does NOT hit
 * the external APIs (those are synced separately by /api/sync).
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
