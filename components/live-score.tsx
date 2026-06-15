"use client"

import { useMatchTimer } from "@/components/match-timer"
import { cn } from "@/lib/utils"

export function LiveScore({ homeScore, awayScore, kickoff, isLive }: { homeScore: number; awayScore: number; kickoff: string; isLive: boolean }) {
  const { elapsed } = useMatchTimer(kickoff, isLive)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        <span className="font-heading text-2xl sm:text-3xl tabular text-card-foreground">{homeScore}</span>
        <span className="text-lg text-muted-foreground">-</span>
        <span className="font-heading text-2xl sm:text-3xl tabular text-card-foreground">{awayScore}</span>
      </div>
      {isLive && elapsed !== null && (
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
          </span>
          <span className="font-heading text-xs tabular text-live">{elapsed}'</span>
        </div>
      )}
    </div>
  )
}
