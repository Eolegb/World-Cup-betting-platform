"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchGames, parseScorers } from "@/lib/worldcup26"

const WC26_TOKEN = process.env.NEXT_PUBLIC_WORLDCUP26_TOKEN

/**
 * Récupère les scores en direct depuis worldcup26.ir directement depuis le browser.
 * Pas de timeout Vercel — c'est le browser qui fait l'appel HTTP.
 * - Matchs terminés  → saveBatchResults (score final + règlement des paris)
 * - Matchs en cours  → saveBatchResults (score intermédiaire, pas de règlement)
 */
export function useLiveScores(seconds = 45) {
  const router = useRouter()
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    async function tick() {
      try {
        // Déclencher le sync serveur (scheduled → live, rattrapage paris)
        const syncRes = await fetch("/api/sync/live")
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          if (!syncData.ok) {
            console.warn("[LiveScores] Sync/live failed:", syncData.error)
          }
        }

        const games = await fetchGames(WC26_TOKEN)

        // Matchs terminés (score final)
        const finished = games.filter(
          (g) => g.finished === "TRUE" && g.home_score !== "null" && g.home_score !== "",
        )

        // Matchs en cours (score intermédiaire)
        const inProgress = games.filter(
          (g) =>
            g.finished === "FALSE" &&
            g.home_score !== "null" &&
            g.home_score !== "" &&
            g.time_elapsed !== "" &&
            g.time_elapsed !== "0",
        )

        const toSave = [
          ...finished.map((g) => ({
            homeTeam: g.home_team_name_en,
            awayTeam: g.away_team_name_en,
            homeScore: parseInt(g.home_score) || 0,
            awayScore: parseInt(g.away_score) || 0,
            elapsed: 90,
            finished: true,
            goals: [
              ...parseScorers(g.home_scorers, g.home_team_name_en),
              ...parseScorers(g.away_scorers, g.away_team_name_en),
            ],
          })),
          ...inProgress.map((g) => ({
            homeTeam: g.home_team_name_en,
            awayTeam: g.away_team_name_en,
            homeScore: parseInt(g.home_score) || 0,
            awayScore: parseInt(g.away_score) || 0,
            elapsed: parseInt(g.time_elapsed) || undefined,
            finished: false,
            goals: [],
          })),
        ]

        if (toSave.length > 0) {
          const { saveBatchResults } = await import("@/app/actions/save-batch-results")
          const result = await saveBatchResults(toSave)
          if (result.ok && (result.updated > 0 || result.settled > 0)) {
            console.log(`[LiveScores] ${result.updated} mis à jour, ${result.settled} paris réglés`)
          }
        }
      } catch {
        // silent
      } finally {
        router.refresh()
      }
    }

    tick()
    const id = setInterval(tick, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
}
