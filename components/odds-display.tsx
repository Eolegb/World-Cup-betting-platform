"use client"

import useSWR from "swr"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { formatOdds } from "@/lib/format"
import type { NormalizedOdds } from "@/lib/odds-service"
import { RefreshCw, AlertTriangle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error("API error"); return r.json() })

type OddsFlash = { homeWin?: number; draw?: number; awayWin?: number; over25?: number; under25?: number }

export function OddsDisplay({ matchId, status, homeTeam, awayTeam, className }: { matchId: number; status?: string; homeTeam?: string; awayTeam?: string; className?: string }) {
  const isFinished = status === "finished" || status === "live"

  const { data, error, isValidating, mutate } = useSWR<NormalizedOdds>(
    isFinished ? null : `/api/odds/${matchId}`,
    fetcher,
    {
      refreshInterval: isFinished ? 0 : 30000,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )

  const [flash, setFlash] = useState<OddsFlash>({})
  const prev = useRef<NormalizedOdds | null>(null)
  const errorCount = useRef(0)

  useEffect(() => {
    if (data && prev.current) {
      const changed: OddsFlash = {}
      if (prev.current.homeWin !== data.homeWin) changed.homeWin = data.homeWin
      if (prev.current.draw !== data.draw) changed.draw = data.draw
      if (prev.current.awayWin !== data.awayWin) changed.awayWin = data.awayWin
      if (prev.current.over25 !== data.over25) changed.over25 = data.over25
      if (prev.current.under25 !== data.under25) changed.under25 = data.under25
      if (Object.keys(changed).length > 0) {
        setFlash(changed)
        setTimeout(() => setFlash({}), 1500)
      }
    }
    prev.current = data ?? null
  }, [data])

  // Tab visibility: pause/resume polling and refetch on return
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") mutate()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [mutate])

  // Error tracking
  useEffect(() => { if (error) errorCount.current++ }, [error])

  if (error && errorCount.current >= 3) {
    return (
      <div className={cn("flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground", className)}>
        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
        Cotes temporairement indisponibles
        <button onClick={() => { errorCount.current = 0; mutate() }} className="ml-auto text-primary underline underline-offset-2">Réessayer</button>
      </div>
    )
  }

  if (error) return <OddsSkeleton className={className} />
  if (!data) return <OddsSkeleton className={className} />

  const odds = data
  const updatedAgo = getTimeAgo(odds.updatedAt)

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <OddsCell label="1" team={homeTeam || "Domicile"} value={odds.homeWin} flash={flash.homeWin !== undefined} />
        <OddsCell label="N" team="Nul" value={odds.draw} flash={flash.draw !== undefined} isDraw />
        <OddsCell label="2" team={awayTeam || "Extérieur"} value={odds.awayWin} flash={flash.awayWin !== undefined} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <RefreshCw className={cn("h-2.5 w-2.5", isValidating && "animate-spin")} />
          {isValidating ? "Actualisation..." : `Mis à jour ${updatedAgo}`}
        </span>
        <span className="hidden sm:inline">+2.5: {formatOdds(odds.over25)} / -2.5: {formatOdds(odds.under25)}</span>
      </div>
    </div>
  )
}

function OddsCell({ label, team, value, flash, isDraw }: { label: string; team: string; value: number; flash: boolean; isDraw?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center rounded-xl border p-1.5 sm:p-2 text-center transition-all duration-300",
      flash ? "border-gold/60 bg-gold/10 animate-glow-pulse" : isDraw ? "border-border/50 bg-secondary/20" : "border-border/50 glass",
    )}>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-full">{team}</span>
      <span className={cn(
        "font-heading text-base sm:text-lg tabular transition-colors duration-300",
        flash ? "text-gold scale-110" : "text-gold"
      )}>
        {formatOdds(value)}
      </span>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

function OddsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-1.5 animate-pulse", className)}>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center rounded-xl border border-border/30 bg-secondary/10 p-1.5 sm:p-2 gap-1">
            <div className="h-2.5 w-8 bg-secondary/40 rounded" />
            <div className="h-5 w-12 bg-secondary/30 rounded" />
            <div className="h-2.5 w-4 bg-secondary/40 rounded" />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-secondary/20 rounded" />
        <div className="h-3 w-24 bg-secondary/20 rounded hidden sm:block" />
      </div>
    </div>
  )
}

function getTimeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 10) return "à l'instant"
  if (diff < 60) return `il y a ${Math.floor(diff)}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  return `il y a ${Math.floor(diff / 3600)}h`
}
