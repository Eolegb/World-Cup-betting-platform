"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { MatchRow } from "@/lib/queries"
import { flagForTeam } from "@/lib/flags"
import { teamColors } from "@/lib/team-colors"
import { statusLabel } from "@/lib/format"
import { Clock, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { LiveBadge } from "@/components/match-bits"

function kickoffLabel(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function Countdown({ kickoff }: { kickoff: Date }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = kickoff.getTime() - now
  if (diff <= 0) return <span className="text-xs text-muted-foreground">Coup d&apos;envoi imminent</span>

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium tabular text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      {days > 0 && (
        <>
          <span>{days}j</span>
          <span className="text-border">·</span>
        </>
      )}
      <span>
        {String(hours).padStart(2, "0")}h{String(minutes).padStart(2, "0")}m
      </span>
    </span>
  )
}

function ScoreBlock({ home, away }: { home: number; away: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1.5 font-heading tabular">
      <span className="text-xl text-card-foreground">{home}</span>
      <span className="text-sm text-muted-foreground">-</span>
      <span className="text-xl text-card-foreground">{away}</span>
    </div>
  )
}

export default function MatchCard({ match: m }: { match: MatchRow }) {
  const isLive = m.status === "live"
  const showScore = m.status === "live" || m.status === "finished"
  const colors = teamColors(m.homeTeam)

  return (
    <Link
      href={`/match/${m.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
    >
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }}
      />

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{m.stage ?? "Coupe du Monde 2026"}</span>
          {isLive ? (
            <LiveBadge kickoff={new Date(m.kickoff).toISOString()} />
          ) : (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                m.status === "finished"
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {statusLabel(m.status)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <span className="shrink-0 text-lg leading-none">{flagForTeam(m.homeTeam, m.homeTeamCode)}</span>
            <span className="truncate font-medium text-card-foreground">{m.homeTeam}</span>
          </div>
          {showScore ? <ScoreBlock home={m.homeScore} away={m.awayScore} /> : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <span className="shrink-0 text-lg leading-none">{flagForTeam(m.awayTeam, m.awayTeamCode)}</span>
            <span className="truncate font-medium text-card-foreground">{m.awayTeam}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          {m.status === "finished" ? (
            <span className="text-xs text-muted-foreground">Résultat final</span>
          ) : m.status === "scheduled" ? (
            <Countdown kickoff={new Date(m.kickoff)} />
          ) : (
            <span className="text-xs text-muted-foreground">{kickoffLabel(new Date(m.kickoff))}</span>
          )}
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            {m.status === "finished" ? "Voir les paris" : "Parier"}
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
