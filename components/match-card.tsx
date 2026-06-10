import Link from "next/link"
import type { MatchRow } from "@/lib/queries"
import { LiveBadge, StatusPill, TeamCode } from "@/components/match-bits"
import { ChevronRight } from "lucide-react"

function kickoffLabel(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function MatchCard({ match: m }: { match: MatchRow }) {
  const isLive = m.status === "live"
  const showScore = m.status === "live" || m.status === "finished"

  return (
    <Link
      href={`/match/${m.id}`}
      className="group block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{m.stage ?? "Coupe du Monde 2026"}</span>
        {isLive ? <LiveBadge elapsed={m.elapsed} /> : <StatusPill status={m.status} />}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <TeamCode code={m.homeTeamCode} name={m.homeTeam} />
          <span className="font-medium text-card-foreground">{m.homeTeam}</span>
        </div>
        {showScore ? (
          <span className="font-heading text-xl tabular text-card-foreground">{m.homeScore}</span>
        ) : null}
      </div>

      <div className="my-2 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <TeamCode code={m.awayTeamCode} name={m.awayTeam} />
          <span className="font-medium text-card-foreground">{m.awayTeam}</span>
        </div>
        {showScore ? (
          <span className="font-heading text-xl tabular text-card-foreground">{m.awayScore}</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {m.status === "finished" ? "Résultat final" : kickoffLabel(new Date(m.kickoff))}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          {m.status === "finished" ? "Voir les paris" : "Parier"}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
