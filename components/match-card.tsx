"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { MatchRow } from "@/lib/queries"
import { flagForTeam } from "@/lib/flags"
import { teamColors } from "@/lib/team-colors"
import { utcDate, kickoffDate, kickoffTime } from "@/lib/datetime"
import { formatStage } from "@/lib/utils"
import { Clock } from "lucide-react"
import { LiveBadge } from "@/components/match-bits"

function MatchCountdown({ kickoff }: { kickoff: Date | string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const target = utcDate(kickoff).getTime()
  const diff = target - now
  if (diff <= 0) return <span className="text-xs text-muted-foreground">Coup d&apos;envoi imminent</span>
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return <span className="text-xs tabular text-muted-foreground">{days}j {hours}h {minutes}min</span>
  return <span className="flex items-center gap-1.5 text-xs font-medium tabular text-muted-foreground"><Clock className="h-3.5 w-3.5" />{String(hours).padStart(2, "0")}h{String(minutes).padStart(2, "0")}m</span>
}

function ScoreBlock({ home, away }: { home: number | string; away: number | string }) {
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
  const isStaleScheduled = m.status === "scheduled" && (Date.now() - utcDate(m.kickoff).getTime()) > 130 * 60000
  const showScore = m.status === "live" || m.status === "finished" || isStaleScheduled
  const colors = teamColors(m.homeTeam)

  return (
    <Link
      href={`/match/${m.id}`}
      className="group block overflow-hidden rounded-2xl border border-border/60 glass hover-lift hover-glow interactive"
    >
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center rounded-full border border-border/60 bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {formatStage(m.stage)}
          </span>
          {isLive && <LiveBadge kickoff={new Date(m.kickoff).toISOString()} />}
          {m.status === "finished" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Terminé</span>}
          {isStaleScheduled && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Terminé</span>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <span className="shrink-0 text-2xl leading-none">{flagForTeam(m.homeTeam, m.homeTeamCode)}</span>
            <span className="truncate font-medium text-card-foreground">{m.homeTeam}</span>
          </div>
          {showScore ? (
            <ScoreBlock
              home={isStaleScheduled ? "?" : m.homeScore}
              away={isStaleScheduled ? "?" : m.awayScore}
            />
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <span className="shrink-0 text-2xl leading-none">{flagForTeam(m.awayTeam, m.awayTeamCode)}</span>
            <span className="truncate font-medium text-card-foreground">{m.awayTeam}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
          {m.status === "finished" || isStaleScheduled ? (
            <span className="text-xs text-muted-foreground">Résultat final</span>
          ) : m.status === "scheduled" ? (
            <MatchCountdown kickoff={m.kickoff} />
          ) : null}
          <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
        </div>
      </div>
    </Link>
  )
}
