"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

type Selection = {
  matchId: number; label: string; homeTeam: string; awayTeam: string
  outcomeKey: string; outcomeLabel: string; odds: number; payload: Record<string, unknown>
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
  const [markets, setMarkets] = useState<Record<number, Outcome[]>>({})
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

  function isSelected(matchId: number) { return selections.some(s => s.matchId === matchId) }

  async function handleToggle(m: MatchRow) {
    if (isSelected(m.id)) {
      setSelections(prev => prev.filter(s => s.matchId !== m.id))
      setExpanded(null)
      return
    }
    if (selections.length >= 5) return

    if (expanded === m.id) {
      setExpanded(null)
      return
    }

    if (markets[m.id]) {
      setExpanded(m.id)
      return
    }

    setExpanded(m.id)
    setLoadingMarket(m.id)
    try {
      const res = await fetch(`/api/markets/${m.id}`)
      const data = await res.json()
      const result = data.markets?.find((x: any) => x.type === "match_result")
      if (result?.outcomes) {
        setMarkets(prev => ({ ...prev, [m.id]: result.outcomes }))
      }
    } catch { /* ignore */ }
    finally { setLoadingMarket(null) }
  }

  function handleSelect(m: MatchRow, o: Outcome) {
    setSelections(prev => [...prev.filter(s => s.matchId !== m.id), {
      matchId: m.id, label: `${m.homeTeam} vs ${m.awayTeam}`,
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      outcomeKey: o.key, outcomeLabel: o.label, odds: o.odds, payload: o.payload,
    }])
    setExpanded(null)
  }

  async function handleSubmit() {
    if (!canSubmit) return
    const inputs = selections.map(s => ({
      matchId: s.matchId, marketType: "match_result" as const,
      label: `${s.label}: ${s.outcomeLabel}`,
      selection: s.payload, odds: s.odds, stake: 0,
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
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-gold" />
        <h3 className="font-heading text-lg">Pari combiné</h3>
        {selections.length >= 2 && <Badge className="bg-gold/20 text-gold">x{selections.length}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">Choisis 2 à 5 matchs, un résultat par match. Tous gagnants pour remporter.</p>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
        {matches.map(m => {
          const sel = selections.find(s => s.matchId === m.id)
          const isExpanded = expanded === m.id

          return (
            <div key={m.id} className={cn("rounded-xl border", sel ? "border-primary/50 bg-primary/5" : "border-border bg-card")}>
              <button type="button" onClick={() => handleToggle(m)} className="flex w-full items-center gap-2 p-3 text-left">
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2", sel ? "border-primary bg-primary text-white" : "border-muted-foreground/40")}>
                  {sel && <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </span>
                <span>{flagForTeam(m.homeTeam, m.homeTeamCode)}</span>
                <span className="text-sm font-medium truncate">{m.homeTeam}</span>
                <span className="text-xs text-muted-foreground shrink-0">vs</span>
                <span>{flagForTeam(m.awayTeam, m.awayTeamCode)}</span>
                <span className="text-sm font-medium truncate">{m.awayTeam}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(m.kickoff))}
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", isExpanded && "rotate-180")} />
              </button>

              {isExpanded && sel === undefined && (
                <div className="border-t border-border px-3 pb-3 pt-2">
                  {loadingMarket === m.id ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">Chargement...</p>
                  ) : markets[m.id] ? (
                    <div className="flex gap-2">
                      {markets[m.id].map(o => (
                        <button key={o.key} onClick={() => handleSelect(m, o)} className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium hover:border-primary/40 transition-colors">
                          <div>{o.label}</div>
                          <div className="font-heading text-lg tabular text-gold mt-0.5">{formatOdds(o.odds)}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-center text-xs text-muted-foreground">Aucune cote disponible.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selections.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-heading text-base">
            <Coins className="h-4 w-4 text-gold" /> Ticket combiné
            <Badge className="bg-gold/20 text-gold">x{selections.length}</Badge>
          </h3>

          <div className="flex flex-col gap-2 mb-3">
            {selections.map(s => (
              <div key={s.matchId} className="flex items-center gap-2 rounded-lg border bg-background/40 px-3 py-2">
                <span className="flex-1 truncate text-xs">{s.label} · {s.outcomeLabel}</span>
                <span className="font-heading text-sm tabular text-gold shrink-0">{formatOdds(s.odds)}</span>
                <button onClick={() => setSelections(prev => prev.filter(x => x.matchId !== s.matchId))} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-secondary/50 p-3 text-center mb-3">
            <p className="text-xs text-muted-foreground">Cote combinée</p>
            <p className="font-heading text-2xl tabular text-gold">{formatOdds(combinedOdds)}</p>
          </div>

          <label className="mb-1 block text-xs font-medium text-muted-foreground">Mise (€)</label>
          <Input type="number" min={1} max={balance} value={stake} onChange={e => setStake(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="mb-2" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[25, 50, 100, 250].map(q => <button key={q} disabled={q > balance} onClick={() => setStake(q)} className="rounded-lg border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 disabled:opacity-40">{q}€</button>)}
            <button onClick={() => setStake(balance)} className="rounded-lg border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40">Max</button>
          </div>

          {selections.length >= 2 && (
            <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm mb-3">
              <div className="flex justify-between text-muted-foreground"><span>Gain net</span><span className="tabular text-primary">+{formatMoney(profit)}</span></div>
              <div className="flex justify-between"><span>Retour total</span><span className="font-heading tabular text-gold">{formatMoney(payout)}</span></div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full font-medium">
            {submitting ? "Validation..." : `Parier ${formatMoney(stake)} (x${selections.length})`}
          </Button>
          {selections.length === 1 && <p className="mt-2 text-center text-xs text-muted-foreground">Sélectionne au moins 2 matchs.</p>}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">Solde : {formatMoney(balance)}</p>
    </div>
  )
}
