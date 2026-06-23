"use client"

import { useEffect, useState } from "react"
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
  const [show, setShow] = useState(false)

  useEffect(() => {
    const kickTime = new Date(kickoff).getTime()
    const fetchMin = kickTime - 40 * 60 * 1000 // 40 min before

    async function check() {
      if (Date.now() >= fetchMin && !data) {
        const dateStr = new Date(kickoff).toISOString().split("T")[0]
        const result = await getMatchLineups(homeTeam, awayTeam, dateStr)
        if (result.home || result.away) {
          setData(result)
          setShow(true)
        }
      }
    }

    check()
    const id = setInterval(check, 60000) // check every minute
    return () => clearInterval(id)
  }, [homeTeam, awayTeam, kickoff, data])

  if (!show || !data) return null

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
