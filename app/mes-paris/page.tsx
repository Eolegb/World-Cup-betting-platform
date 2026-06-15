import { requireUser, AppShell } from "@/components/app-shell"
import { getUserBets, getUserBetStats } from "@/lib/queries"
import { formatMoney, formatOdds, betStatusLabel } from "@/lib/format"
import { Ticket, Filter, TrendingUp, TrendingDown, Sparkles } from "lucide-react"
import Link from "next/link"
import { CancelBetButton } from "./cancel-button"
import { JokerButton } from "@/components/joker-button"

export const dynamic = "force-dynamic"

export default async function MyBetsPage() {
  const { user, profile: p } = await requireUser()
  const data = await getUserBets(user.id)
  const stats = await getUserBetStats(user.id) as any

  const totalStaked = data.reduce((s, b) => s + b.bet.stake, 0)
  const wonBets = data.filter((b) => b.bet.status === "won")
  const lostBets = data.filter((b) => b.bet.status === "lost")
  const totalWon = wonBets.reduce((s, b) => s + b.bet.potentialPayout - b.bet.stake, 0)
  const totalLost = lostBets.reduce((s, b) => s + b.bet.stake, 0)
  const netResult = totalWon - totalLost

  const pendingBets = data.filter((b) => b.bet.status === "pending")
  const settledBets = data.filter((b) => b.bet.status !== "pending")

  return (
    <AppShell profile={p}>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl text-foreground">
          <Ticket className="h-5 w-5 text-primary" />
          Mes paris
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suis l&apos;historique de tous tes paris et leur statut.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Ticket className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-heading text-lg text-foreground">Aucun pari pour le moment</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Rends-toi sur la page Matchs pour placer ton premier pari.
          </p>
        </div>
      ) : (
        <>
          {/* Stats summary */}
          <div className="mb-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total misé</p>
              <p className="mt-1 font-heading text-xl tabular text-foreground">{formatMoney(totalStaked)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Gains</p>
              <p className="mt-1 font-heading text-xl tabular text-primary">{formatMoney(totalWon)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Pertes</p>
              <p className="mt-1 font-heading text-xl tabular text-destructive">{formatMoney(totalLost)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Résultat net</p>
              <div className="mt-1 flex items-center gap-1">
                {netResult >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={`font-heading text-xl tabular ${netResult >= 0 ? "text-primary" : "text-destructive"}`}>
                  {netResult >= 0 ? "+" : ""}{formatMoney(netResult)}
                </span>
              </div>
            </div>
          </div>

          {/* Advanced stats */}
          {stats && (stats.successRate > 0 || stats.favoriteTeam) && (
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Taux de réussite</p>
                <p className="mt-1 font-heading text-xl tabular text-primary">
                  {stats.successRate ? `${Math.round(stats.successRate)}%` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Meilleur marché</p>
                <p className="mt-1 font-heading text-lg text-gold truncate">{stats.bestMarket ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Équipe fétiche</p>
                <p className="mt-1 font-heading text-lg text-foreground truncate">{stats.favoriteTeam ?? "—"}</p>
              </div>
            </div>
          )}

          {p.streak > 0 && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-2">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-medium text-orange-400">
                {p.streak} victoire{p.streak > 1 ? "s" : ""} d&apos;affilée !
                {p.bestStreak > p.streak && ` (record: ${p.bestStreak})`}
              </span>
            </div>
          )}

          {/* Pending bets */}
          {pendingBets.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 font-heading text-base text-foreground">
                <Filter className="h-4 w-4 text-live" />
                En cours ({pendingBets.length})
              </h2>
              <div className="flex flex-col gap-2">
                {pendingBets.map(({ bet: b, match: m }) => (
                  <div key={b.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50">
                    <Link href={`/match/${b.matchId}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {b.label}
                        {b.isJoker && <span className="ml-1.5 inline-flex items-center rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">🎩 x2</span>}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="tabular">Mise {formatMoney(b.stake)}</span>
                        <span>·</span>
                        <span className="tabular">Cote {formatOdds(b.odds)}</span>
                        {m && <><span>·</span><span>{m.homeTeam} vs {m.awayTeam}</span></>}
                      </div>
                    </Link>
                    <div className="ml-4 flex items-center gap-3 text-right">
                      <div>
                        <span className="inline-flex items-center rounded-full bg-live/15 px-2 py-0.5 text-xs font-medium text-live">
                          En cours
                        </span>
                        <p className="mt-1 font-heading text-xs tabular text-gold">
                          Gain pot. {formatMoney(b.potentialPayout)}
                        </p>
                      </div>
                      {!b.isJoker && <JokerButton betId={b.id} jokerUsedAt={p.jokerUsedAt} />}
                      <CancelBetButton betId={b.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settled bets */}
          {settledBets.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-heading text-base text-foreground">
                <Filter className="h-4 w-4 text-muted-foreground" />
                Historique ({settledBets.length})
              </h2>
              <div className="flex flex-col gap-2">
                {settledBets.map(({ bet: b, match: m }) => (
                  <div key={b.id} className={`flex items-center justify-between rounded-2xl border p-4 ${
                    b.status === "won" ? "border-primary/30 bg-primary/5" : b.status === "lost" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                  }`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {b.label}
                        {b.isJoker && <span className="ml-1.5 inline-flex items-center rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">🎩 x2</span>}
                        {b.bonusPoints > 0 && <span className="ml-1.5 text-xs text-primary">+{b.bonusPoints}pts</span>}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="tabular">Mise {formatMoney(b.stake)}</span>
                        <span>·</span>
                        <span className="tabular">Cote {formatOdds(b.odds)}</span>
                        {m && <><span>·</span><span>{m.homeTeam} vs {m.awayTeam}</span></>}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.status === "won" ? "bg-primary/20 text-primary" : b.status === "lost" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                      }`}>
                        {betStatusLabel(b.status)}
                      </span>
                      <p className={`mt-1 font-heading text-xs tabular ${b.status === "won" ? "text-primary" : "text-destructive"}`}>
                        {b.status === "won" ? `+${formatMoney(b.potentialPayout - b.stake)}` : `-${formatMoney(b.stake)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}
