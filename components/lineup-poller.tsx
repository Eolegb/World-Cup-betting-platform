"use client"

import { useEffect, useState, useRef } from "react"
import { getMatchLineups } from "@/app/actions/lineups"
import { LineupLoader } from "@/components/lineup-field"
import type { TeamLineup } from "@/lib/providers"
import { Users } from "lucide-react"

type LineupData = {
  home: (TeamLineup & { color?: string }) | null
  away: (TeamLineup & { color?: string }) | null
}

export function LineupPoller({
  homeTeam,
  awayTeam,
  kickoff,
}: {
  homeTeam: string
  awayTeam: string
  kickoff: string
}) {
  const [data, setData] = useState<LineupData | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return

    const kickTime = new Date(kickoff).getTime()
    const fetchAt = kickTime - 40 * 60 * 1000 // 40 min before kickoff
    const delay = Math.max(0, fetchAt - Date.now())

    const timer = setTimeout(async () => {
      fetched.current = true
      const dateStr = new Date(kickoff).toISOString().split("T")[0]
      const result = await getMatchLineups(homeTeam, awayTeam, dateStr)
      if (result.home || result.away) {
        setData(result)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [homeTeam, awayTeam, kickoff])

  if (!data) return null

  return (
    <div className="mb-6 space-y-3">
      <h3 className="flex items-center gap-2 font-heading text-sm text-card-foreground">
        <Users className="h-4 w-4 text-primary" />
        Compositions
      </h3>
      <LineupLoader
        homeLineup={data.home}
        awayLineup={data.away}
        homeColor={data.home?.color}
        awayColor={data.away?.color}
      />
    </div>
  )
}
