"use client"

import { useState } from "react"
import { toast } from "sonner"
import { refreshMatchOdds } from "@/app/actions/refresh-odds"
import { RefreshCw } from "lucide-react"

export function AdminFetchOddsButton({
  homeTeam,
  awayTeam,
  kickoff,
}: {
  homeTeam: string
  awayTeam: string
  kickoff: Date | string
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const iso = kickoff instanceof Date ? kickoff.toISOString() : kickoff
    const res = await refreshMatchOdds(homeTeam, awayTeam, iso)
    if (res.ok) {
      toast.success(`Cotes mises à jour (${res.odds?.source ?? "therundown"})`)
      window.location.reload()
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "..." : "Cotes"}
    </button>
  )
}
