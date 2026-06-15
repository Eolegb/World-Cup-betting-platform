import { notFound } from "next/navigation"
import { requireUser, AppShell } from "@/components/app-shell"
import { getMatch, getMatchEvents, marketsForMatch, getMatchBetsForUser } from "@/lib/queries"
import { getBetsForMatch } from "@/app/actions/bets"
import { LiveScore } from "@/components/live-score"
import { MatchChat } from "@/components/match-chat"
import { BettingTabs } from "@/components/betting-tabs"
import { LiveBadge, StatusPill } from "@/components/match-bits"
import { AutoRefresh } from "@/components/auto-refresh"
import { flagForTeam } from "@/lib/flags"
import { teamColors } from "@/lib/team-colors"
import { formatMoney, betStatusLabel, formatOdds } from "@/lib/format"
import { Avatar } from "@/components/avatar"
import { MapPin, Calendar, Clock, Activity, Users } from "lucide-react"
import { Countdown } from "@/components/countdown"

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
  const allBets = await getBetsForMatch(matchId)

  const isLive = m.status === "live"
  const isScheduled = m.status === "scheduled"
  const isFinished = m.status === "finished"
  const canBet = isScheduled
  const goals = events.filter((e) => e.type === "goal")

  const homeColors = teamColors(m.homeTeam)
  const awayColors = teamColors(m.awayTeam)
  const homeFlag = flagForTeam(m.homeTeam, m.homeTeamCode)
  const awayFlag = flagForTeam(m.awayTeam, m.awayTeamCode)

  return (
    <AppShell profile={p}>
      {isLive && <AutoRefresh seconds={30} />}

      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border">
        <div className="flex h-2">
          <div className="flex-1" style={{ backgroundColor: homeColors.primary }} />
          <div className="flex-1" style={{ backgroundColor: awayColors.primary }} />
        </div>
        <div className="bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{m.stage ?? "Coupe du Monde 2026"}</span>
            <div className="flex items-center gap-2">
              {isLive ? <LiveBadge elapsed={m.elapsed} /> : <StatusPill status={m.status} />}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <span className="text-3xl">{homeFlag}</span>
              <div>
                <p className="font-heading text-xl text-card-foreground">{m.homeTeam}</p>
              </div>
            </div>

            {isLive ? (
              <LiveScore homeScore={m.homeScore} awayScore={m.awayScore} elapsed={m.elapsed} isLive={true} />
            ) : isFinished ? (
              <LiveScore homeScore={m.homeScore} awayScore={m.awayScore} elapsed={null} isLive={false} />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="font-heading text-2xl tabular text-muted-foreground">VS</span>
                <Countdown kickoff={m.kickoff.toISOString()} />
              </div>
            )}

            <div className="flex flex-1 items-center justify-end gap-3 text-right">
              <div>
                <p className="font-heading text-xl text-card-foreground">{m.awayTeam}</p>
              </div>
              <span className="text-3xl">{awayFlag}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(m.kickoff))}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.kickoff))}
            </span>
            {m.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {m.venue}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <MatchChat matchId={matchId} />
        </aside>

        <div className="min-w-0 space-y-6">
          {goals.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm text-card-foreground">
                <Activity className="h-4 w-4 text-live" />
                Événements du match
              </h3>
              <div className="flex flex-col gap-2">
                {goals.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="font-heading text-xs tabular text-primary">
                      {e.extraMinute ? `${e.minute}+${e.extraMinute}'` : `${e.minute}'`}
                    </span>
                    <span className="text-sm text-card-foreground">
                      {e.player ?? "Inconnu"} ({e.team}) ⚽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allBets && allBets.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm text-card-foreground">
                <Users className="h-4 w-4 text-primary" />
                Qui parie quoi {isScheduled ? "(détails cachés avant le coup d'envoi)" : ""}
              </h3>
              <div className="flex flex-col gap-2">
                {allBets.slice(0, 10).map((b: any) => (
                  <div key={b.betId ?? b.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={b.displayName ?? "?"} size="sm" color={b.avatarColor} />
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{b.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {isScheduled ? `a parié sur ${b.marketType === "combined" ? "un combiné" : b.label?.split(":")[0] ?? "un pari"}` : b.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-sm tabular text-gold">{formatMoney(b.stake ?? 0)}</p>
                      <p className="text-xs text-muted-foreground">Cote {formatOdds(b.odds ?? 1)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {userBets.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 font-heading text-sm text-card-foreground">Mes paris sur ce match</h3>
              <div className="flex flex-col gap-2">
                {userBets.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div>
                      <p className="text-sm text-card-foreground">
                        {b.label}
                        {b.isJoker && <span className="ml-1.5 inline-flex items-center rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">🎩 x2</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mise {formatMoney(b.stake)} · Cote {formatOdds(b.odds)}
                        {b.bonusPoints > 0 && <span className="ml-1 text-primary">+{b.bonusPoints} pts bonus</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.status === "won" ? "bg-primary/20 text-primary" : b.status === "lost" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                      }`}>
                        {betStatusLabel(b.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canBet && <BettingTabs matchId={m.id} markets={markets} balance={p.balance} />}
          {!canBet && !isScheduled && (
            <div className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              Les paris sont fermés pour ce match.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
