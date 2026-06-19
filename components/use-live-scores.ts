"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const API_URL = "https://worldcup26.ir/get/games"

type ApiGame = {
  id: string
  home_team_name_en: string
  away_team_name_en: string
  home_score: string
  away_score: string
  home_scorers: string | null
  away_scorers: string | null
  finished: string // "TRUE" | "FALSE"
  time_elapsed: string
  local_date: string
}

/**
 * Fetches live scores from worldcup26.ir directly from the browser.
 * This is a free API, no key required, updated every few seconds.
 * No Vercel timeout risk — the browser makes the HTTP call.
 */
export function useLiveScores(seconds = 45) {
  const router = useRouter()
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    async function tick() {
      try {
        const res = await fetch(API_URL)
        if (!res.ok) return
        const data = await res.json()
        const games: ApiGame[] = data.games || []

        // Find finished games with scores
        const finished = games.filter(
          g => g.finished === "TRUE" && g.home_score !== "null"
        )

        if (finished.length > 0) {
          const { saveBatchResults } = await import("@/app/actions/save-batch-results")
          const result = await saveBatchResults(
            finished.map(g => ({
              homeTeam: g.home_team_name_en,
              awayTeam: g.away_team_name_en,
              homeScore: parseInt(g.home_score) || 0,
              awayScore: parseInt(g.away_score) || 0,
              goals: [...parseScorers(g.home_scorers, g.home_team_name_en), ...parseScorers(g.away_scorers, g.away_team_name_en)],
            }))
          )
          if (result.ok && result.updated > 0) {
            console.log(`[LiveScores] ${result.updated} updated, ${result.settled} settled`)
          }
        }

        router.refresh()
      } catch {
        // silent
      }
    }

    tick()
    const id = setInterval(tick, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
}

/** Parse scorer strings like `{"J. Quiñones 9'","R. Jiménez 67'"} or "J. Quiñones 9'"` */
function parseScorers(raw: string | null, team: string): { player: string; minute: number; team: string }[] {
  if (!raw || raw === "null") return []
  try {
    // Handle JSON array format
    if (raw.startsWith("{")) {
      // It's a Postgres-style array: {"name min'","name min'"}
      const cleaned = raw.replace(/[{}"]/g, "")
      return cleaned.split(",").map(s => {
        const match = s.trim().match(/^(.+)\s+(\d+)['+]?\d*$/)
        if (match) return { player: match[1].trim(), minute: parseInt(match[2]), team }
        return { player: s.trim(), minute: 0, team }
      }).filter(g => g.player)
    }
    // Handle plain string
    const cleaned = raw.replace(/"/g, "")
    const match = cleaned.match(/^(.+)\s+(\d+)['+]?\d*$/)
    if (match) return [{ player: match[1].trim(), minute: parseInt(match[2]), team }]
    return []
  } catch {
    return []
  }
}
