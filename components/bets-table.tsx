"use client"

import { useState, useMemo } from "react"
import { SettleBetButton } from "@/components/settle-bet-button"
import { OverrideBetButton } from "@/components/override-bet-button"
import { formatMoney, formatOdds } from "@/lib/format"
import { Ticket, Download, Filter, X } from "lucide-react"

type BetRow = {
  betId: number; userId: string; displayName: string; matchId: number
  homeTeam: string; awayTeam: string; homeScore: number; awayScore: number
  matchStatus: string; marketType: string; label: string
  stake: number; odds: string; potentialPayout: number
  status: string; payout: number; isJoker: boolean; bonusPoints: number
  createdAt: Date; settledAt: Date | null
}

function exportCSV(bets: BetRow[]) {
  const headers = ["#","Joueur","Match","Score","Pari","Marché","Mise","Cote","Statut","Gain","Date","Joker"]
  const rows = bets.map(b => [
    b.betId,
    b.displayName,
    `${b.homeTeam} vs ${b.awayTeam}`,
    b.matchStatus === "finished" ? `${b.homeScore}-${b.awayScore}` : "-",
    b.label,
    b.marketType,
    b.stake,
    b.odds,
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
    let list = allBets
    if (filterStatus) list = list.filter(b => b.status === filterStatus)
    if (filterUser) list = list.filter(b => b.displayName === filterUser)
    if (filterMarket === "combined") list = list.filter(b => b.marketType === "combined")
    else if (filterMarket) list = list.filter(b => b.marketType === filterMarket)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(b => b.displayName.toLowerCase().includes(s) || b.label.toLowerCase().includes(s) || b.homeTeam.toLowerCase().includes(s) || b.awayTeam.toLowerCase().includes(s))
    }
    // Sort
    if (sortBy === "date") list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else if (sortBy === "stake") list.sort((a,b) => b.stake - a.stake)
    else if (sortBy === "user") list.sort((a,b) => a.displayName.localeCompare(b.displayName))
    else if (sortBy === "payout") list.sort((a,b) => (b.payout - b.stake) - (a.payout - a.stake))
    return list
  }, [allBets, filterStatus, filterUser, filterMarket, search, sortBy])

  const hasFilters = filterStatus || filterUser || filterMarket || search

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="flex items-center gap-2 font-heading text-base text-card-foreground">
            <Ticket className="h-4 w-4 text-primary" />
            Tous les paris ({totalBets})
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              <span className="text-primary">{wonCount} gagnés</span> · <span className="text-destructive">{lostCount} perdus</span> · {pendingCount} en cours
            </span>
            <button onClick={() => exportCSV(filtered)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
              <Download className="h-3 w-3" /> CSV ({filtered.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground w-32 sm:w-40"
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
            <option value="">Tous statuts</option>
            <option value="pending">En cours</option>
            <option value="won">Gagnés</option>
            <option value="lost">Perdus</option>
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground max-w-[120px]">
            <option value="">Tous joueurs</option>
            {userNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
            <option value="">Tous marchés</option>
            <option value="combined">Combinés</option>
            <option value="match_result">1X2</option>
            <option value="totals">Totaux</option>
            <option value="btts">BTTS</option>
            <option value="correct_score">Score exact</option>
            <option value="anytime_scorer">Buteur</option>
            <option value="first_scorer">1er buteur</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground ml-auto">
            <option value="date">Plus récent</option>
            <option value="user">Par joueur</option>
            <option value="stake">Mise ↓</option>
            <option value="payout">Gain ↓</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterStatus(""); setFilterUser(""); setFilterMarket(""); setSearch(""); setSortBy("date") }} className="text-xs text-primary hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Effacer
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="h-9 px-2 text-left font-medium text-muted-foreground text-xs w-9">#</th>
              <th className="h-9 px-2 text-left font-medium text-muted-foreground text-xs">Joueur</th>
              <th className="h-9 px-2 text-left font-medium text-muted-foreground text-xs">Match</th>
              <th className="h-9 px-2 text-left font-medium text-muted-foreground text-xs">Pari</th>
              <th className="h-9 px-2 text-right font-medium text-muted-foreground text-xs">Mise</th>
              <th className="h-9 px-2 text-right font-medium text-muted-foreground text-xs">Cote</th>
              <th className="h-9 px-2 text-center font-medium text-muted-foreground text-xs">Statut</th>
              <th className="h-9 px-2 text-right font-medium text-muted-foreground text-xs">Gain</th>
              <th className="h-9 px-2 text-right font-medium text-muted-foreground text-xs">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.betId} className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${b.status === "won" ? "bg-primary/3" : b.status === "lost" ? "bg-destructive/3" : ""}`}>
                <td className="px-2 py-2.5 tabular text-[10px] text-muted-foreground align-top">#{b.betId}</td>
                <td className="px-2 py-2.5 align-top">
                  <span className="text-xs font-medium text-foreground truncate block max-w-[80px]">{b.displayName}</span>
                </td>
                <td className="px-2 py-2.5 align-top">
                  <span className="text-[11px] text-foreground leading-tight block whitespace-nowrap">{b.homeTeam}<br />{b.matchStatus === "finished" ? `${b.homeScore}-${b.awayScore}` : "vs"} {b.awayTeam}</span>
                </td>
                <td className="px-2 py-2.5 align-top">
                  <span className="text-[11px] text-foreground leading-tight block">
                    {b.label}
                    {b.isJoker && <span className="ml-1 text-[9px] text-gold">🎩</span>}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{b.marketType}</span>
                </td>
                <td className="px-2 py-2.5 text-right font-heading tabular text-[11px] text-foreground align-top">{formatMoney(b.stake)}</td>
                <td className="px-2 py-2.5 text-right tabular text-[11px] text-gold align-top">{formatOdds(b.odds)}</td>
                <td className="px-2 py-2.5 text-center align-top">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    b.status === "won" ? "bg-primary/20 text-primary" : b.status === "lost" ? "bg-destructive/20 text-destructive" : "bg-live/15 text-live"
                  }`}>
                    {b.status === "won" ? "Gagné" : b.status === "lost" ? "Perdu" : "En cours"}
                  </span>
                  <div className="mt-1.5 flex items-center justify-center gap-1">
                    {b.status === "pending" && <SettleBetButton betId={b.betId} />}
                    <OverrideBetButton betId={b.betId} currentStatus={b.status} />
                  </div>
                </td>
                <td className={`px-2 py-2.5 text-right tabular text-[11px] font-heading align-top whitespace-nowrap ${b.status === "won" ? "text-primary" : b.status === "lost" ? "text-destructive" : "text-muted-foreground"}`}>
                  {b.status === "won" ? `+${formatMoney(b.payout - b.stake)}` : b.status === "lost" ? `-${formatMoney(b.stake)}` : formatMoney(b.potentialPayout)}
                </td>
                <td className="px-2 py-2.5 text-right tabular text-[10px] text-muted-foreground align-top whitespace-nowrap">
                  {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(b.createdAt))}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">Aucun pari trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
