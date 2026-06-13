import { notFound } from "next/navigation"
import { requireUser, AppShell } from "@/components/app-shell"
import { getMatch, getMatchEvents, marketsForMatch, getMatchBetsForUser } from "@/lib/queries"
import { BettingInterface } from "@/components/betting-interface"
import { LiveBadge, StatusPill, TeamCode } from "@/components/match-bits"
import { AutoRefresh } from "@/components/auto-refresh"
import { formatMoney, statusLabel, betStatusLabel, formatOdds } from "@/lib/format"
import { MapPin, Calendar, Clock, Activity } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { user, profile: p } = await requireUser()
  const { id } = await params
  const matchId = Number.parseInt(id, 10)
  if (!Number.isFinite(matchId)) notFound()

  const m = await getMatch(matchId)
  if (!m) notFound()

  const events = await getMatchEvents(matchId)
  const markets = marketsForMatch(m)
  const userBets = await getMatchBetsForUser(user.id, matchId)

  const isLive = m.status === "live"
  const isScheduled = m.status === "scheduled"
  const canBet = isScheduled
  const goals = events.filter((e) => e.type === "goal")

  return (
    <AppShell profile={p}>
      {isLive && <AutoRefresh seconds={30} />}

      {/* Match header */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{m.stage ?? "Coupe du Monde 2026"}</span>
          <div className="flex items-center gap-2">
            {isLive ? (
              <LiveBadge elapsed={m.elapsed} />
            ) : (
              <StatusPill status={m.status} />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <TeamCode code={m.homeTeamCode} name={m.homeTeam} />
            <div>
              <p className="font-heading text-xl text-card-foreground">{m.homeTeam}</p>
            </div>
          </div>
          {!isScheduled && (
            <div className="flex items-center gap-2">
              <span className="font-heading text-3xl tabular text-card-foreground">{m.homeScore}</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-heading text-3xl tabular text-card-foreground">{m.awayScore}</span>
            </div>
          )}
          {isScheduled && (
            <span className="font-heading text-xl tabular text-muted-foreground">VS</span>
          )}
          <div className="flex flex-1 items-center justify-end gap-3 text-right">
            <div>
              <p className="font-heading text-xl text-card-foreground">{m.awayTeam}</p>
            </div>
            <TeamCode code={m.awayTeamCode} name={m.awayTeam} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(m.kickoff))}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Intl.DateTimeFormat("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(m.kickoff))}
          </span>
          {m.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {m.venue}
            </span>
          )}
        </div>
      </div>

      {/* Live events */}
      {goals.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-heading text-sm text-card-foreground">
            <Activity className="h-4 w-4 text-live" />
            Événements du match
          </h3>
          <div className="flex flex-col gap-2">
            {goals.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2"
              >
                <span className="font-heading text-xs tabular text-primary">
                  {e.extraMinute ? `${e.minute}+${e.extraMinute}'` : `${e.minute}'`}
                </span>
                <span className="text-sm text-card-foreground">
                  {e.player ?? "Inconnu"} ({e.team})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing bets for this match */}
      {userBets.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 font-heading text-sm text-card-foreground">Mes paris sur ce match</h3>
          <div className="flex flex-col gap-2">
            {userBets.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-card-foreground">{b.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Mise {formatMoney(b.stake)} · Cote {formatOdds(b.odds)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.status === "won"
                        ? "bg-primary/20 text-primary"
                        : b.status === "lost"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {betStatusLabel(b.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Betting interface */}
      <BettingInterface
        matchId={m.id}
        markets={markets}
        balance={p.balance}
        canBet={canBet}
      />
    </AppShell>
  )
}
