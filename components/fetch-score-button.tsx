"use client"

import { useState } from "react"
import { saveMatchResult } from "@/app/actions/save-match-result"
import { toast } from "sonner"

const API_KEY = "42ce3f42f729447884fa54aa9735b19d"

export function FetchScoreButton({ matchId, externalId, homeTeam, awayTeam }: {
  matchId: number
  externalId: number | null
  homeTeam: string
  awayTeam: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleFetch() {
    if (!externalId) {
      toast.error("Pas d'ID externe.")
      return
    }

    setLoading(true)
    try {
      // Fetch directly from the browser (no Vercel timeout)
      const res = await fetch(`https://api.football-data.org/v4/matches/${externalId}`, {
        headers: { "X-Auth-Token": API_KEY },
      })

      if (!res.ok) {
        toast.error(`API erreur HTTP ${res.status}`)
        setLoading(false)
        return
      }

      const detail = await res.json()
      const status = detail.status === "FINISHED" ? "finished" : "scheduled"
      const homeScore = detail.score?.fullTime?.home ?? 0
      const awayScore = detail.score?.fullTime?.away ?? 0
      const goals = (detail.goals || []).map((g: any) => ({
        player: g.scorer?.name ?? "?",
        minute: g.minute ?? 0,
        team: g.team?.name ?? "",
      }))

      // Save to DB via server action (instant, < 1s)
      const saved = await saveMatchResult(matchId, status, homeScore, awayScore, goals)

      if (saved.ok) {
        const isFinished = status === "finished"
        toast.success(
          isFinished
            ? `${homeTeam} ${homeScore}-${awayScore} ${awayTeam} · ${goals.length} buteurs · ${saved.settled} paris résolus`
            : `${homeTeam} vs ${awayTeam} · ${detail.status} (pas fini)`
        )
      } else {
        toast.error("Erreur sauvegarde DB")
      }
    } catch {
      toast.error("Réseau ou API injoignable")
    }
    setLoading(false)
  }

  if (!externalId) return null

  return (
    <button
      onClick={handleFetch}
      disabled={loading}
      className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
      title="Récupérer le score depuis l'API"
    >
      {loading ? "..." : "API"}
    </button>
  )
}
