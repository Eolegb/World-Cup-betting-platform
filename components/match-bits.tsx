"use client"

import { cn } from "@/lib/utils"
import { useMatchTimer } from "@/components/match-timer"

export function LiveBadge({ elapsed: dbElapsed, kickoff }: { elapsed?: number | null; kickoff?: string }) {
  const { elapsed: liveElapsed, isHalftime } = useMatchTimer(kickoff ?? "", !!kickoff)

  const display = liveElapsed ?? dbElapsed

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
      isHalftime ? "bg-orange-500/15 text-orange-400" : "bg-live/15 text-live"
    )}>
      <span className="relative flex h-2 w-2">
        <span className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75",
          isHalftime ? "animate-none bg-orange-400" : "animate-ping bg-live"
        )} />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", isHalftime ? "bg-orange-400" : "bg-live")} />
      </span>
      {isHalftime ? "Mi-temps" : display != null ? `${display}'` : "LIVE"}
    </span>
  )
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    finished: "bg-muted text-muted-foreground",
    scheduled: "bg-secondary text-secondary-foreground",
  }
  const label = status === "finished" ? "Terminé" : "À venir"
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[status] ?? map.scheduled, className)}>
      {label}
    </span>
  )
}

export function TeamCode({ code, name }: { code?: string | null; name: string }) {
  const initials = code ?? name.slice(0, 3).toUpperCase()
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary font-heading text-xs text-secondary-foreground">
      {initials}
    </span>
  )
}
