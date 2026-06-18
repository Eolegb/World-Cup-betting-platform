"use client"

import { useState } from "react"
import { fetchMatchScore } from "@/app/actions/fetch-match-score"
import { toast } from "sonner"

export function FetchScoreButton({ matchId, externalId, homeTeam, awayTeam }: {
  matchId: number
  externalId: number | null
  homeTeam: string
  awayTeam: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleFetch() {
    if (!externalId) {
      toast.error("Pas d'ID externe pour ce match.")
      return
    }
    setLoading(true)
    const res = await fetchMatchScore(matchId, externalId)
    if (res.ok) {
      const isFinished = res.status === "finished"
      if (isFinished) {
        toast.success(`${homeTeam} ${res.homeScore}-${res.awayScore} ${awayTeam} · ${res.goals} buteurs · ${res.apiStatus}`)
      } else {
        toast(`${homeTeam} vs ${awayTeam} · ${res.apiStatus} (pas encore terminé)`)
      }
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  if (!externalId) return null

  return (
    <button
      onClick={handleFetch}
      disabled={loading}
      className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
      title="Interroger l'API pour ce match"
    >
      {loading ? "..." : "API"}
    </button>
  )
}
