"use client"

import { useState, useMemo } from "react"
import { OverrideBetButton } from "@/components/override-bet-button"
import { formatMoney, formatOdds } from "@/lib/format"
import { Ticket, Download, X, ChevronDown } from "lucide-react"

type BetRow = {
  betId: number; userId: string; displayName: string; matchId: number
  homeTeam: string; awayTeam: string; homeScore: number; awayScore: number
  matchStatus: string; marketType: string; label: string
  stake: number; odds: string; potentialPayout: number
  status: string; payout: number; isJoker: boolean; bonusPoints: number
  createdAt: Date; settledAt: Date | null
}

const MARKET_LABELS: Record<string, string> = {
  match_result: "1X2", double_chance: "Double chance", totals: "Buts",
  btts: "BTTS", correct_score: "Score exact", anytime_scorer: "Buteur",
  first_scorer: "1er buteur", combined: "Combiné",
}

function exportCSV(bets: BetRow[]) {
  const headers = ["#","Joueur","Match","Score","Pari","Marché","Mise","Cote","Statut","Gain","Date","Joker"]
  const rows = bets.map(b => [
    b.betId, b.displayName,
    `${b.homeTeam} vs ${b.awayTeam}`,
    b.matchStatus === "finished" ? `${b.homeScore}-${b.awayScore}` : "-",
    b.label, b.marketType, b.stake, b.odds,
    b.status === "won" ? "Gagné" : b.status === "lost" ? "Perdu" : "En cours",
    b.status === "won" ? b.payout - b.stake : b.status === "lost" ? -b.stake : "",
    new Date(b.createdAt).toLocaleDateString("fr-FR"),
    b.isJoker ? "Oui" : "",
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = "paris-betrod.csv"; a.click()
  URL.revokeObjectURL(url)
}

function StyledSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div className="relative flex-1 min-w-[120px]">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-popover px-3 py-2 pr-8 text-sm font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export function BetsTable({ bets: allBets, totalBets, wonCount, lostCount, pendingCount }: {
  bets: BetRow[]
  totalBets: number; wonCount: number; lostCount: number; pendingCount: number
}) {
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [filterUser, setFilterUser] = useState<string>("")
  const [filterMarket, setFilterMarket] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("date")
  const [search, setSearch] = useState("")

  const userNames = useMemo(() => [...new Set(allBets.map(b => b.displayName))].sort(), [allBets])

  const filtered = useMemo(() => {
    let list = [...allBets]
    if (filterStatus) list = list.filter(b => b.status === filterStatus)
    if (filterUser) list = list.filter(b => b.displayName === filterUser)
    if (filterMarket === "combined") list = list.filter(b => b.marketType === "combined")
    else if (filterMarket) list = list.filter(b => b.marketType === filterMarket)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(b =>
        b.displayName.toLowerCase().includes(s) ||
        b.label.toLowerCase().includes(s) ||
        b.homeTeam.toLowerCase().includes(s) ||
        b.awayTeam.toLowerCase().includes(s)
      )
    }
    if (sortBy === "date") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else if (sortBy === "stake") list.sort((a, b) => b.stake - a.stake)
    else if (sortBy === "user") list.sort((a, b) => a.displayName.localeCompare(b.displayName))
    else if (sortBy === "payout") list.sort((a, b) => b.payout - a.payout)
    return list
  }, [allBets, filterStatus, filterUser, filterMarket, search, sortBy])

  const hasFilters = filterStatus || filterUser || filterMarket || search

  return (
    <section className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="flex items-center gap-2 font-heading text-base text-foreground">
          <Ticket className="h-4 w-4 text-primary" />
          Tous les paris
          <span className="text-sm font-normal text-muted-foreground">({totalBets})</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
          <span className="text-primary font-medium">{wonCount} gagnés</span>
          <span>·</span>
          <span className="text-destructive font-medium">{lostCount} perdus</span>
          <span>·</span>
          <span className="font-medium">{pendingCount} en cours</span>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> CSV ({filtered.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-3 mb-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <input
              type="text"
              placeholder="Rechercher joueur, pari, équipe…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterStatus(""); setFilterUser(""); setFilterMarket(""); setSearch(""); setSortBy("date") }}
              className="flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Effacer
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <StyledSelect value={filterStatus} onChange={setFilterStatus}>
            <option value="">Tous statuts</option>
            <option value="pending">⏳ En cours</option>
            <option value="won">✅ Gagnés</option>
            <option value="lost">❌ Perdus</option>
          </StyledSelect>
          <StyledSelect value={filterUser} onChange={setFilterUser}>
            <option value="">Tous les joueurs</option>
            {userNames.map(n => <option key={n} value={n}>{n}</option>)}
          </StyledSelect>
          <StyledSelect value={filterMarket} onChange={setFilterMarket}>
            <option value="">Tous les marchés</option>
            <option value="combined">Combinés</option>
            <option value="match_result">1X2</option>
            <option value="totals">Buts</option>
            <option value="btts">BTTS</option>
            <option value="correct_score">Score exact</option>
            <option value="anytime_scorer">Buteur</option>
            <option value="first_scorer">1er buteur</option>
          </StyledSelect>
          <StyledSelect value={sortBy} onChange={setSortBy}>
            <option value="date">Plus récent</option>
            <option value="user">Par joueur</option>
            <option value="stake">Mise ↓</option>
            <option value="payout">Gain ↓</option>
          </StyledSelect>
        </div>
      </div>

      {/* Bet cards */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucun pari trouvé.
          </div>
        )}
        {filtered.map(b => {
          const isPending = b.status === "pending"
          const isWon = b.status === "won"
          const isLost = b.status === "lost"
          return (
            <div
              key={b.betId}
              className={`rounded-xl border bg-card ${
                isWon ? "border-primary/30" : isLost ? "border-destructive/20" : "border-border"
              }`}
            >
              {/* Status bar */}
              <div className={`h-1 w-full rounded-t-xl ${isWon ? "bg-primary" : isLost ? "bg-destructive" : "bg-muted"}`} />

              <div className="flex items-start gap-3 p-3">
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Match + date */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {b.homeTeam}
                      {b.matchStatus === "finished" && (
                        <span className="mx-1 font-heading text-muted-foreground">{b.homeScore}–{b.awayScore}</span>
                      )}
                      <span className="font-normal text-muted-foreground"> vs </span>
                      {b.awayTeam}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                      {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(b.createdAt))}
                    </span>
                  </div>

                  {/* Player + market */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{b.displayName}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {MARKET_LABELS[b.marketType] ?? b.marketType}
                    </span>
                    {b.isJoker && <span className="text-xs text-gold">🎩 Joker</span>}
                  </div>

                  {/* Bet label */}
                  <p className="text-sm text-foreground/80 leading-snug">{b.label}</p>

                  {/* Mise · Cote · Gain */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Mise <span className="font-heading text-foreground">{formatMoney(b.stake)}</span></span>
                    <span className="text-muted-foreground">×</span>
                    <span className="font-heading text-gold">{formatOdds(b.odds)}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className={`font-heading font-semibold ${isWon ? "text-primary" : isLost ? "text-destructive" : "text-foreground"}`}>
                      {isWon ? `+${formatMoney(b.payout - b.stake)}` : isLost ? `-${formatMoney(b.stake)}` : formatMoney(b.potentialPayout)}
                    </span>
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isWon ? "bg-primary/20 text-primary" : isLost ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                  }`}>
                    {isWon ? "✅ Gagné" : isLost ? "❌ Perdu" : "⏳ En cours"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <OverrideBetButton betId={b.betId} currentStatus={b.status} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
