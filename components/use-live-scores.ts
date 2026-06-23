"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchGames, parseScorers } from "@/lib/worldcup26"

// Optionnel : token JWT pour l'API worldcup26.ir (tier authentifié).
// Ajouter NEXT_PUBLIC_WORLDCUP26_TOKEN dans .env.local pour l'activer.
const WC26_TOKEN = process.env.NEXT_PUBLIC_WORLDCUP26_TOKEN

/**
 * Récupère les scores en direct depuis worldcup26.ir directement depuis le browser.
 * Pas de timeout Vercel — c'est le browser qui fait l'appel HTTP.
 * Envoie ensuite les résultats au server action saveBatchResults.
 */
export function useLiveScores(seconds = 45) {
  const router = useRouter()
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    async function tick() {
      try {
        const syncRes = await fetch("/api/sync/live")
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          if (!syncData.ok) {
            console.warn("[LiveScores] Sync/live failed:", syncData.error)
          }
        }

        const games = await fetchGames(WC26_TOKEN)

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
              goals: [
                ...parseScorers(g.home_scorers, g.home_team_name_en),
                ...parseScorers(g.away_scorers, g.away_team_name_en),
              ],
            }))
          )
          if (result.ok && result.updated > 0) {
            console.log(`[LiveScores] ${result.updated} updated, ${result.settled} settled`)
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
