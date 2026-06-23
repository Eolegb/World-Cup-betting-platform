"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatMoney, formatOdds } from "@/lib/format"
import { flagForTeam } from "@/lib/flags"
import { placeCombinedBet } from "@/app/actions/bets"
import { Coins, Layers, X, ChevronDown } from "lucide-react"

type MatchRow = {
  id: number; homeTeam: string; awayTeam: string
  homeTeamCode: string | null; awayTeamCode: string | null
  kickoff: string; stage: string | null
}

type Outcome = { key: string; label: string; odds: number; payload: Record<string, unknown> }
type MarketData = { type: string; label: string; outcomes: Outcome[] }

type Selection = {
  matchId: number
  matchLabel: string
  homeTeam: string
  awayTeam: string
  marketType: string
  marketLabel: string
  outcomeKey: string
  outcomeLabel: string
  odds: number
  payload: Record<string, unknown>
}

const MARKET_TABS: { type: string; short: string }[] = [
  { type: "match_result", short: "1X2" },
  { type: "double_chance", short: "DC" },
  { type: "totals", short: "Buts" },
  { type: "btts", short: "BTTS" },
  { type: "anytime_scorer", short: "Buteur" },
]

function shortTeam(name: string): string {
  return name.length > 3 ? name.slice(0, 3).toUpperCase() : name.toUpperCase()
}

export function BettingCombined({ balance }: { balance: number }) {
  const router = useRouter()
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<Selection[]>([])
  const [stake, setStake] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Record<number, string>>({})
  const [markets, setMarkets] = useState<Record<number, MarketData[]>>({})
  const [loadingMarket, setLoadingMarket] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/matches")
      .then(r => { if (!r.ok) throw new Error("Erreur API"); return r.json() })
      .then(data => { setMatches(Array.isArray(data) ? data : []) })
      .catch(() => setError("Impossible de charger les matchs"))
      .finally(() => setLoading(false))
  }, [])

  const combinedOdds = useMemo(() => {
    let p = 1
    selections.forEach(s => { p *= s.odds })
    return Math.round(p * 100) / 100
  }, [selections])

  const payout = Math.round(stake * combinedOdds)
  const profit = Math.round(stake * (combinedOdds - 1))
  const canSubmit = selections.length >= 2 && selections.length <= 5 && stake > 0 && stake <= balance

  function getMarketsFor(matchId: number) { return markets[matchId] ?? [] }

  function getActiveOutcomes(matchId: number): Outcome[] {
    const tab = activeTab[matchId] ?? "match_result"
    const m = markets[matchId]
    if (!m) return []
    return m.find(x => x.type === tab)?.outcomes ?? []
  }

  function getActiveMarketLabel(matchId: number): string {
    const tab = activeTab[matchId] ?? "match_result"
    const m = markets[matchId]
    if (!m) return ""
    return m.find(x => x.type === tab)?.label ?? ""
  }

  async function loadMarkets(matchId: number) {
    if (markets[matchId]) return
    setLoadingMarket(matchId)
    try {
      const res = await fetch(`/api/markets/${matchId}`)
      const data = await res.json()
      if (data.markets?.length) {
        setMarkets(prev => ({ ...prev, [matchId]: data.markets }))
      }
    } catch { /* ignore */ }
    finally { setLoadingMarket(null) }
  }

  async function handleToggle(m: MatchRow) {
    if (expanded === m.id) {
      setExpanded(null)
      return
    }
    setExpanded(m.id)
    await loadMarkets(m.id)
  }

  function handleDeselect(matchId: number) {
    setSelections(prev => prev.filter(s => s.matchId !== matchId))
    setExpanded(null)
  }

  function handleSelect(m: MatchRow, o: Outcome) {
    const tab = activeTab[m.id] ?? "match_result"
    const marketLabel = getActiveMarketLabel(m.id)
    setSelections(prev => [...prev.filter(s => s.matchId !== m.id), {
      matchId: m.id,
      matchLabel: `${shortTeam(m.homeTeam)} vs ${shortTeam(m.awayTeam)}`,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      marketType: tab,
      marketLabel,
      outcomeKey: o.key,
      outcomeLabel: o.label,
      odds: o.odds,
      payload: o.payload,
    }])
    setExpanded(null)
  }

  async function handleSubmit() {
    if (!canSubmit) return
    const inputs = selections.map(s => ({
      matchId: s.matchId,
      marketType: s.marketType,
      label: `${s.matchLabel}: ${s.outcomeLabel}`,
      selection: s.payload,
      odds: s.odds,
      stake: 0,
    }))
    setSubmitting(true)
    try {
      const res = await placeCombinedBet(inputs, stake)
      if (res.ok) {
        toast.success(`Combiné x${inputs.length} placé !`)
        setSelections([])
        setExpanded(null)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error("Erreur lors du pari combiné")
    }
    setSubmitting(false)
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Chargement des matchs...</div>
  if (error) return <div className="py-8 text-center text-sm text-destructive">{error}</div>

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 font-heading text-lg">
          <Layers className="h-5 w-5 text-gold" />
          Pari combiné
          {selections.length >= 2 && <span className="text-sm text-gold font-normal">x{selections.length}</span>}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisis 2 à 5 événements. Tous gagnants pour remporter.
        </p>
      </div>

      <div className="space-y-2">
        {matches.map(m => {
          const sel = selections.find(s => s.matchId === m.id)
          const isExpanded = expanded === m.id
          const tab = activeTab[m.id] ?? "match_result"
          const homeFlag = flagForTeam(m.homeTeam, m.homeTeamCode)
          const awayFlag = flagForTeam(m.awayTeam, m.awayTeamCode)

          return (
            <div key={m.id} className={cn(
              "rounded-2xl border overflow-hidden transition-colors",
              sel ? "border-primary/40 bg-primary/5" : "border-border/60 glass"
            )}>
              <div className="p-3">
                {/* Top row: checkbox + teams + date + chevron */}
                <div className="flex items-center gap-2">
                  {sel ? (
                    <button
                      type="button"
                      onClick={() => handleDeselect(m.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-white"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ) : (
                    <div className="h-6 w-6 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggle(m)}
                    className="flex flex-1 items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-xl">{homeFlag}</span>
                    <span className="text-sm font-medium">{shortTeam(m.homeTeam)}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="text-sm font-medium">{shortTeam(m.awayTeam)}</span>
                    <span className="text-xl">{awayFlag}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(m.kickoff))}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", isExpanded && "rotate-180")} />
                  </button>
                </div>

                {sel && (
                  <div className="mt-2 ml-8">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary font-medium">
                      {sel.marketLabel} · {sel.outcomeLabel}
                      <span className="ml-1 text-gold font-heading">{formatOdds(sel.odds)}</span>
                    </span>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-border/40">
                  <div className="flex overflow-x-auto gap-1 px-3 pt-2 pb-1 scrollbar-none">
                    {MARKET_TABS.filter(t => getMarketsFor(m.id).some(mk => mk.type === t.type)).map(t => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setActiveTab(prev => ({ ...prev, [m.id]: t.type }))}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          tab === t.type
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t.short}
                      </button>
                    ))}
                  </div>

                  <div className="px-3 pb-3 pt-1">
                    {loadingMarket === m.id ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">Chargement...</p>
                    ) : tab === "anytime_scorer" ? (
                      <CombinedScorerSelect
                        outcomes={getActiveOutcomes(m.id)}
                        homeTeam={m.homeTeam}
                        awayTeam={m.awayTeam}
                        selectedKey={sel?.marketType === "anytime_scorer" ? sel.outcomeKey : null}
                        onSelect={o => handleSelect(m, o)}
                      />
                    ) : getActiveOutcomes(m.id).length ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {getActiveOutcomes(m.id).map(o => {
                          const isCurrent = sel?.outcomeKey === o.key && sel?.marketType === tab
                          return (
                            <button
                              key={o.key}
                              type="button"
                              onClick={() => handleSelect(m, o)}
                              className={cn(
                                "rounded-xl border px-3 py-3 text-left transition-colors",
                                isCurrent
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/30 hover:bg-muted/30"
                              )}
                            >
                              <div className="text-sm font-medium text-card-foreground leading-tight">{o.label}</div>
                              <div className={cn("font-heading text-base tabular mt-1", isCurrent ? "text-primary" : "text-gold")}>
                                {formatOdds(o.odds)}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-xs text-muted-foreground">Aucune cote disponible.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {matches.length === 0 && !loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">Aucun match à venir.</p>
      )}

      {selections.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-heading text-base">
            <Coins className="h-4 w-4 text-gold" /> Ticket
            <span className="text-sm text-gold font-normal">x{selections.length}</span>
          </h3>

          <div className="space-y-1.5 mb-3">
            {selections.map(s => (
              <div key={`${s.matchId}-${s.marketType}`} className="flex items-center gap-2 rounded-lg border bg-background/40 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.matchLabel}</p>
                  <p className="text-sm font-medium truncate">{s.outcomeLabel}</p>
                </div>
                <span className="font-heading text-sm tabular text-gold shrink-0">{formatOdds(s.odds)}</span>
                <button
                  type="button"
                  onClick={() => setSelections(prev => prev.filter(x => x.matchId !== s.matchId))}
                  className="p-1 -mr-1 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-secondary/50 p-3 text-center mb-3">
            <p className="text-xs text-muted-foreground">Cote combinée</p>
            <p className="font-heading text-2xl tabular text-gold">{formatOdds(combinedOdds)}</p>
          </div>

          <label className="mb-1 block text-xs font-medium text-muted-foreground">Mise (€)</label>
          <Input
            type="number" min={1} max={balance} value={stake}
            onChange={e => setStake(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="mb-2"
          />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[25, 50, 100, 250].map(q => (
              <button
                key={q}
                type="button"
                disabled={q > balance}
                onClick={() => setStake(q)}
                className="rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 disabled:opacity-40"
              >
                {q}€
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStake(balance)}
              className="rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40"
            >
              Max
            </button>
          </div>

          {selections.length >= 2 && (
            <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm mb-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Gain net</span>
                <span className="tabular text-primary">+{formatMoney(profit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Retour total</span>
                <span className="font-heading tabular text-gold">{formatMoney(payout)}</span>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full font-medium h-11">
            {submitting ? "Validation..." : `Parier ${formatMoney(stake)} (x${selections.length})`}
          </Button>
          {selections.length === 1 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">Sélectionne au moins 2 événements.</p>
          )}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">Solde : {formatMoney(balance)}</p>
    </div>
  )
}

function CombinedScorerSelect({
  outcomes,
  homeTeam,
  awayTeam,
  selectedKey,
  onSelect,
}: {
  outcomes: Outcome[]
  homeTeam: string
  awayTeam: string
  selectedKey: string | null
  onSelect: (o: Outcome) => void
}) {
  const homeFlag = flagForTeam(homeTeam)
  const awayFlag = flagForTeam(awayTeam)
  const homePlayers = outcomes.filter(o => String(o.payload.team) === "home")
  const awayPlayers = outcomes.filter(o => String(o.payload.team) === "away")
  const others = outcomes.filter(o => String(o.payload.team) !== "home" && String(o.payload.team) !== "away")

  return (
    <div className="relative">
      <select
        value={selectedKey ?? ""}
        onChange={e => {
          const o = outcomes.find(o => o.key === e.target.value)
          if (o) onSelect(o)
        }}
        className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
      >
        <option value="">— Choisir un buteur —</option>
        {homePlayers.length > 0 && (
          <optgroup label={`${homeFlag} ${homeTeam}`}>
            {homePlayers.map(o => (
              <option key={o.key} value={o.key}>{o.label} — ×{formatOdds(o.odds)}</option>
            ))}
          </optgroup>
        )}
        {awayPlayers.length > 0 && (
          <optgroup label={`${awayFlag} ${awayTeam}`}>
            {awayPlayers.map(o => (
              <option key={o.key} value={o.key}>{o.label} — ×{formatOdds(o.odds)}</option>
            ))}
          </optgroup>
        )}
        {others.map(o => (
          <option key={o.key} value={o.key}>{o.label} — ×{formatOdds(o.odds)}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </div>
  )
}
