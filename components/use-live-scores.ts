"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const API_KEY = "42ce3f42f729447884fa54aa9735b19d"

/**
 * Fetches match scores directly from the browser (no Vercel timeout).
 * Runs every N seconds. When a match finishes, saves the result to DB.
 * This bypasses Vercel's 10s serverless limit entirely.
 */
export function useLiveScores(seconds = 45) {
  const router = useRouter()
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    async function tick() {
      try {
        console.log("[LiveScores] Fetching all WC matches from browser...")

        // 1. Fetch ALL fixtures in one call (1 API request, < 2s from browser)
        const res = await fetch(
          `https://api.football-data.org/v4/competitions/WC/matches?season=2026&limit=200`,
          { headers: { "X-Auth-Token": API_KEY } }
        )

        if (!res.ok) {
          console.warn("[LiveScores] API error:", res.status)
          return
        }

        const data = await res.json()
        const fixtures = data.matches || []
        console.log(`[LiveScores] Got ${fixtures.length} fixtures, checking for changes...`)

        // 2. Find finished matches with scores
        const finished = fixtures.filter(
          (f: any) =>
            f.status === "FINISHED" &&
            f.score?.fullTime?.home != null
        )

        if (finished.length > 0) {
          // 3. Send results to server for saving (instantané, pas d'appel API côté serveur)
          const { saveBatchResults } = await import("@/app/actions/save-batch-results")
          const result = await saveBatchResults(
            finished.map((f: any) => ({
              externalId: f.id,
              homeScore: f.score.fullTime.home,
              awayScore: f.score.fullTime.away,
              goals: (f.goals || []).map((g: any) => ({
                player: g.scorer?.name ?? "?",
                minute: g.minute ?? 0,
                team: g.team?.name ?? "",
              })),
            }))
          )

          if (result.ok && result.updated > 0) {
            console.log(`[LiveScores] Updated ${result.updated} matches, settled ${result.settled} bets`)
          }
        }

        // 4. Refresh the page data
        router.refresh()
      } catch (e) {
        console.warn("[LiveScores] Error:", e)
      }
    }

    // Run immediately, then every N seconds
    tick()
    const id = setInterval(tick, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
}
