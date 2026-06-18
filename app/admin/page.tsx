import { requireUser, AppShell } from "@/components/app-shell"
import { getMatches, getAllBetsAdmin } from "@/lib/queries"
import { db } from "@/lib/db"
import { user as userTable, profile } from "@/lib/db/schema"
import { Database, RefreshCw, FlaskConical, Users, Ticket } from "lucide-react"
import { redirect } from "next/navigation"
import { AdminActions } from "./actions"
import { ResetBalancesButton } from "@/components/reset-balances-button"
import { SettleBetButton } from "@/components/settle-bet-button"
import { formatMoney, formatOdds, betStatusLabel } from "@/lib/format"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { user, profile: p } = await requireUser()
  if (!p.isAdmin) redirect("/")

  const matches = await getMatches()
  const totalMatches = matches.length
  const live = matches.filter((m) => m.status === "live").length
  const scheduled = matches.filter((m) => m.status === "scheduled").length
  const finished = matches.filter((m) => m.status === "finished").length

  const users = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    balance: profile.balance,
    isAdmin: profile.isAdmin,
    streak: profile.streak,
  }).from(userTable).leftJoin(profile, eq(userTable.id, profile.userId))

  const bets = await getAllBetsAdmin()
  const totalBets = bets.length
  const pendingCount = bets.filter(b => b.status === "pending").length
  const wonCount = bets.filter(b => b.status === "won").length
  const lostCount = bets.filter(b => b.status === "lost").length

  return (
    <AppShell profile={p}>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl text-foreground">
          <Database className="h-5 w-5 text-primary" />
          Administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Synchronisation des données, gestion des matchs et des paris.
        </p>
      </div>

      {/* Players list */}
      <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 font-heading text-base text-card-foreground">
            <Users className="h-4 w-4 text-primary" />
            Joueurs ({users.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Nom</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Solde</th>
                <th className="hidden sm:table-cell h-10 px-4 text-left font-medium text-muted-foreground">Email</th>
                <th className="hidden sm:table-cell h-10 px-4 text-left font-medium text-muted-foreground">ID</th>
                <th className="hidden sm:table-cell h-10 px-4 text-center font-medium text-muted-foreground">Streak</th>
                <th className="hidden sm:table-cell h-10 px-4 text-center font-medium text-muted-foreground">Admin</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border transition-colors hover:bg-muted/50">
                  <td className="p-3 font-medium text-card-foreground">{u.name}</td>
                  <td className="p-3 text-right font-heading tabular text-foreground">{u.balance ?? 1000}€</td>
                  <td className="hidden sm:table-cell p-3 text-xs text-muted-foreground">{u.email}</td>
                  <td className="hidden sm:table-cell p-3 font-mono text-[10px] text-muted-foreground">{u.id}</td>
                  <td className="hidden sm:table-cell p-3 text-center">{u.streak ? `🔥 ${u.streak}` : "—"}</td>
                  <td className="hidden sm:table-cell p-3 text-center">{u.isAdmin ? "✅" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync buttons */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base text-card-foreground">
          <RefreshCw className="h-4 w-4 text-primary" />
          Synchronisation des données
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Récupère les matchs, scores et cotes depuis les API externes. Résout automatiquement les paris.
        </p>
        <AdminActions />
      </div>

      {/* Admin tools */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base text-card-foreground">
          <FlaskConical className="h-4 w-4 text-gold" />
          Outils
        </h2>
        <div className="flex flex-wrap gap-3">
          <ResetBalancesButton />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total matchs</p>
          <p className="mt-1 font-heading text-xl tabular text-foreground">{totalMatches}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Paris placés</p>
          <p className="mt-1 font-heading text-xl tabular text-foreground">{totalBets}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Gagnés / Perdus</p>
          <p className="mt-1 font-heading text-xl tabular text-foreground">
            <span className="text-primary">{wonCount}</span>
            <span className="text-muted-foreground"> / </span>
            <span className="text-destructive">{lostCount}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">En cours</p>
          <p className="mt-1 font-heading text-xl tabular text-live">{pendingCount}</p>
        </div>
      </div>

      {/* Bets list */}
      <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-base text-card-foreground">
            <Ticket className="h-4 w-4 text-primary" />
            Tous les paris ({totalBets})
          </h2>
          <span className="text-xs text-muted-foreground">
            <span className="text-primary">{wonCount} gagnés</span> · <span className="text-destructive">{lostCount} perdus</span> · {pendingCount} en cours
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="h-9 px-3 text-left font-medium text-muted-foreground text-xs">#</th>
                <th className="h-9 px-3 text-left font-medium text-muted-foreground text-xs">Joueur</th>
                <th className="h-9 px-3 text-left font-medium text-muted-foreground text-xs">Match</th>
                <th className="h-9 px-3 text-left font-medium text-muted-foreground text-xs">Pari</th>
                <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">Mise</th>
                <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">Cote</th>
                <th className="h-9 px-3 text-center font-medium text-muted-foreground text-xs">Statut</th>
                <th className="h-9 px-3 text-center font-medium text-muted-foreground text-xs"></th>
                <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">Gain</th>
                <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b) => (
                <tr key={b.betId} className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${b.status === "won" ? "bg-primary/3" : b.status === "lost" ? "bg-destructive/3" : ""}`}>
                  <td className="px-3 py-2 tabular text-[10px] text-muted-foreground">#{b.betId}</td>
                  <td className="px-3 py-2">
                    <span className="text-sm font-medium text-foreground truncate max-w-[90px] block">{b.displayName}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-foreground">{b.homeTeam} {b.matchStatus === "finished" ? `${b.homeScore}-${b.awayScore}` : "vs"} {b.awayTeam}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-foreground max-w-[150px] truncate block">
                      {b.label}
                      {b.isJoker && <span className="ml-1 text-[9px] text-gold">🎩</span>}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{b.marketType}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-heading tabular text-xs text-foreground">{formatMoney(b.stake)}</td>
                  <td className="px-3 py-2 text-right tabular text-xs text-gold">{formatOdds(b.odds)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      b.status === "won" ? "bg-primary/20 text-primary" : b.status === "lost" ? "bg-destructive/20 text-destructive" : "bg-live/15 text-live"
                    }`}>
                      {b.status === "won" ? "Gagné" : b.status === "lost" ? "Perdu" : "En cours"}
                    </span>
                  </td>
                  <td className="px-1 py-2 text-center">
                    {b.status === "pending" && <SettleBetButton betId={b.betId} />}
                  </td>
                  <td className={`px-3 py-2 text-right tabular text-xs font-heading ${b.status === "won" ? "text-primary" : b.status === "lost" ? "text-destructive" : "text-muted-foreground"}`}>
                    {b.status === "won" ? `+${formatMoney(b.payout - b.stake)}` : b.status === "lost" ? `-${formatMoney(b.stake)}` : formatMoney(b.potentialPayout)}
                  </td>
                  <td className="px-3 py-2 text-right tabular text-[10px] text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(b.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-heading text-base text-card-foreground">Matchs ({totalMatches})</h2>
        </div>
        {matches.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun match. Lance une synchronisation ou génère des données de démo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">ID</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Match</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Date</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Score</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-border transition-colors hover:bg-muted/50">
                    <td className="p-4 tabular text-xs text-muted-foreground">#{m.id}</td>
                    <td className="p-4 text-card-foreground">
                      {m.homeTeam} vs {m.awayTeam}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(m.kickoff))}
                    </td>
                    <td className="p-4 text-center font-heading tabular text-card-foreground">
                      {m.status === "scheduled" ? "-" : `${m.homeScore} - ${m.awayScore}`}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === "live"
                            ? "bg-live/15 text-live"
                            : m.status === "finished"
                              ? "bg-muted text-muted-foreground"
                              : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {m.status === "live" ? "En direct" : m.status === "finished" ? "Terminé" : "À venir"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
