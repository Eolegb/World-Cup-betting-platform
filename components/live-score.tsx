"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function LiveScore({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  elapsed,
  isLive,
}: {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  elapsed: number | null
  isLive: boolean
}) {
  const router = useRouter()

  useEffect(() => {
    if (!isLive) return
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router, isLive])

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-1 items-center justify-end gap-2">
        <span className="truncate text-right text-sm font-medium text-card-foreground sm:text-base">
          {homeTeam}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3">
        <span className="font-heading text-2xl tabular text-card-foreground sm:text-3xl">{homeScore}</span>
        <span className="flex flex-col items-center gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">-</span>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-live">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
              </span>
              {elapsed != null ? `${elapsed}'` : "LIVE"}
            </span>
          )}
        </span>
        <span className="font-heading text-2xl tabular text-card-foreground sm:text-3xl">{awayScore}</span>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-card-foreground sm:text-base">
          {awayTeam}
        </span>
      </div>
    </div>
  )
}
