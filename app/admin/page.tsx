import { requireUser, AppShell } from "@/components/app-shell"
import { getMatches, getAllBetsAdmin } from "@/lib/queries"
import { db } from "@/lib/db"
import { user as userTable, profile } from "@/lib/db/schema"
import { Users, Ticket, Trophy, Activity, Settings2, RefreshCw } from "lucide-react"
import { kickoffDate, kickoffTime } from "@/lib/datetime"
import { redirect } from "next/navigation"
import { AdminActions } from "./actions"
import { ResetBalancesButton } from "@/components/reset-balances-button"
import { BetsTable } from "@/components/bets-table"
import { ManualScoreForm } from "@/components/manual-score-form"
import { FetchScoreButton } from "@/components/fetch-score-button"
import { Avatar } from "@/components/avatar"
import { formatMoney } from "@/lib/format"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { profile: p } = await requireUser()
  if (!p.isAdmin) redirect("/")

  const matches = await getMatches()
  const users = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    image: userTable.image,
    balance: profile.balance,
    isAdmin: profile.isAdmin,
    streak: profile.streak,
    avatarColor: profile.avatarColor,
  }).from(userTable).leftJoin(profile, eq(userTable.id, profile.userId))

  const bets = await getAllBetsAdmin()

  // Stats
  const totalMatches = matches.length
  const liveMatches = matches.filter(m => m.status === "live")
  const scheduledMatches = matches.filter(m => m.status === "scheduled")
  const finishedMatches = matches.filter(m => m.status === "finished")
  const totalBets = bets.length
  const pendingCount = bets.filter(b => b.status === "pending").length
  const wonCount = bets.filter(b => b.status === "won").length
  const lostCount = bets.filter(b => b.status === "lost").length

  // Pending bets per match (for match rows)
  const pendingByMatch = bets.reduce((acc, b) => {
    if (b.status === "pending") acc[b.matchId] = (acc[b.matchId] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  // Sorted: live first, then scheduled, then finished
  const sortedMatches = [
    ...liveMatches,
    ...scheduledMatches,
    ...finishedMatches,
  ]

  return (
    <AppShell profile={p}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-foreground">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestion des matchs, paris et joueurs.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Matchs"
          value={`${totalMatches}`}
          sub={`${liveMatches.length} live · ${scheduledMatches.length} à venir`}
          accent={liveMatches.length > 0 ? "live" : "default"}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Paris en attente"
          value={`${pendingCount}`}
          sub={`sur ${totalBets} total`}
          accent="pending"
          icon={<Ticket className="h-4 w-4" />}
        />
        <StatCard
          label="Gagnés"
          value={`${wonCount}`}
          sub={`${totalBets > 0 ? Math.round(wonCount / totalBets * 100) : 0}% du total`}
          accent="won"
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatCard
          label="Perdus"
          value={`${lostCount}`}
          sub={`${totalBets > 0 ? Math.round(lostCount / totalBets * 100) : 0}% du total`}
          accent="lost"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PARIS (en haut pour accès rapide)                                   */}
      {/* ------------------------------------------------------------------ */}
      <BetsTable
        bets={bets}
        totalBets={totalBets}
        wonCount={wonCount}
        lostCount={lostCount}
        pendingCount={pendingCount}
      />

      {/* ------------------------------------------------------------------ */}
      {/* MATCHS                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="mb-3 font-heading text-base text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Matchs
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {liveMatches.length > 0 && <span className="text-live mr-2">● {liveMatches.length} en direct</span>}
            {scheduledMatches.length} à venir · {finishedMatches.length} terminés
          </span>
        </h2>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {sortedMatches.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aucun match. Lancez une synchronisation.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedMatches.map(m => {
                const pending = pendingByMatch[m.id] ?? 0
                return (
                  <MatchAdminRow
                    key={m.id}
                    match={m}
                    pendingBets={pending}
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* JOUEURS + OUTILS (côte à côte sur desktop)                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Joueurs */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 font-heading text-sm text-card-foreground">
              <Users className="h-4 w-4 text-primary" />
              Joueurs ({users.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={u.name ?? "?"} image={u.image} avatarColor={u.avatarColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.name ?? "—"}
                    {u.isAdmin && <span className="ml-1.5 text-[9px] bg-primary/20 text-primary rounded px-1 py-0.5">admin</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-heading tabular text-foreground">{formatMoney(u.balance ?? 1000)}</p>
                  {(u.streak ?? 0) > 0 && (
                    <p className="text-[10px] text-orange-400">🔥 {u.streak}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outils */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 font-heading text-sm text-card-foreground">
              <Settings2 className="h-4 w-4 text-primary" />
              Outils
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Actions</p>
              <AdminActions />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Soldes</p>
              <ResetBalancesButton />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label, value, sub, accent, icon,
}: {
  label: string
  value: string
  sub: string
  accent: "default" | "live" | "pending" | "won" | "lost"
  icon: React.ReactNode
}) {
  const accentMap = {
    default: "text-primary",
    live: "text-live",
    pending: "text-muted-foreground",
    won: "text-primary",
    lost: "text-destructive",
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={`${accentMap[accent]} opacity-60`}>{icon}</span>
      </div>
      <p className={`font-heading text-2xl tabular ${accentMap[accent]}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function MatchAdminRow({
  match: m,
  pendingBets,
}: {
  match: {
    id: number
    homeTeam: string
    awayTeam: string
    kickoff: Date
    status: string
    homeScore: number
    awayScore: number
    externalId: number | null
    stage?: string | null
  }
  pendingBets: number
}) {
  const isStaleScheduled = m.status === "scheduled" && (Date.now() - new Date(m.kickoff).getTime()) > 130 * 60000
  const showScore = m.status === "live" || m.status === "finished" || isStaleScheduled

  const statusConfig = {
    live: { dot: "bg-live", label: "En direct", bg: "bg-live/5 border-l-2 border-l-live" },
    scheduled: { dot: "bg-blue-400", label: "À venir", bg: "" },
    finished: { dot: "bg-muted-foreground/40", label: "Terminé", bg: "opacity-70" },
  }
  const cfg = m.status === "scheduled" && !isStaleScheduled ? statusConfig.scheduled
    : isStaleScheduled ? statusConfig.finished
    : statusConfig[m.status as keyof typeof statusConfig] ?? statusConfig.scheduled

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${cfg.bg} hover:bg-muted/30 transition-colors`}>
      {/* Status dot */}
      <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${m.status === "live" ? "animate-pulse" : ""}`} />

      {/* Teams + date */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {m.homeTeam} <span className="text-muted-foreground font-normal">vs</span> {m.awayTeam}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground">
            {kickoffDate(m.kickoff)} {kickoffTime(m.kickoff)}
          </span>
          {pendingBets > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {pendingBets} en attente
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-center w-16">
        {showScore ? (
          <span className="font-heading text-base tabular text-foreground">
            {isStaleScheduled && !m.homeScore ? "?" : m.homeScore} <span className="text-muted-foreground text-xs">-</span> {isStaleScheduled && !m.awayScore ? "?" : m.awayScore}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">–</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <FetchScoreButton
          matchId={m.id}
          externalId={m.externalId}
          homeTeam={m.homeTeam}
          awayTeam={m.awayTeam}
        />
        {m.status !== "finished" && (
          <ManualScoreForm
            matchId={m.id}
            homeTeam={m.homeTeam}
            awayTeam={m.awayTeam}
          />
        )}
      </div>
    </div>
  )
}
