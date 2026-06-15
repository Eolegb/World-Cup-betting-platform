"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatMoney, formatOdds } from "@/lib/format"
import { MARKET_LABELS, type MarketType } from "@/lib/markets"
import { flagForTeam } from "@/lib/flags"
import { placeCombinedBet, type PlaceBetInput } from "@/app/actions/bets"
import { Coins, Layers, X, Plus, ChevronDown, Sparkles, AlertCircle } from "lucide-react"

type MatchOption = {
  id: number
  homeTeam: string
  awayTeam: string
  homeTeamCode: string | null
  awayTeamCode: string | null
  kickoff: string
  stage: string | null
  label: string
}

type MarketOutcome = {
  key: string
  label: string
  odds: number
  payload: Record<string, unknown>
}

type Selection = {
  matchId: number
  matchLabel: string
  homeTeam: string
  awayTeam: string
  marketType: MarketType
  outcome: MarketOutcome
}

function kickoffLabel(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr))
}

export function BettingCombined({
  matches,
  balance,
}: {
  matches: MatchOption[]
  balance: number
}) {
  const router = useRouter()
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(new Set())
  const [selections, setSelections] = useState<Map<number, Selection>>(new Map())
  const [stake, setStake] = useState<number>(50)
  const [submitting, setSubmitting] = useState(false)
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)
  const [marketCache, setMarketCache] = useState<Map<number, MarketOutcome[]>>(new Map())
  const [loadingMarkets, setLoadingMarkets] = useState<Set<number>>(new Set())

  const availableMatches = useMemo(
    () => matches.filter((m) => new Date(m.kickoff) > new Date()),
    [matches],
  )

  const combinedOdds = useMemo(() => {
    let product = 1
    for (const s of selections.values()) {
      product *= s.outcome.odds
    }
    return Math.round(product * 100) / 100
  }, [selections])

  const potentialPayout = Math.round(stake * combinedOdds)
  const netProfit = Math.round(stake * (combinedOdds - 1))
  const count = selections.size
  const canSubmit = count >= 2 && count <= 5 && stake > 0 && stake <= balance

  function toggleMatch(matchId: number) {
    const next = new Set(selectedMatchIds)
    if (next.has(matchId)) {
      next.delete(matchId)
      const nextSelections = new Map(selections)
      nextSelections.delete(matchId)
      setSelections(nextSelections)
      if (expandedMatch === matchId) setExpandedMatch(null)
    } else if (next.size < 5) {
      next.add(matchId)
      setExpandedMatch(matchId)
      if (!marketCache.has(matchId)) {
        loadMatchResultMarket(matchId)
      }
    }
    setSelectedMatchIds(next)
  }

  function selectOutcome(matchId: number, matchLabel: string, homeTeam: string, awayTeam: string, outcome: MarketOutcome) {
    const next = new Map(selections)
    next.set(matchId, {
      matchId,
      matchLabel,
      homeTeam,
      awayTeam,
      marketType: "match_result",
      outcome,
    })
    setSelections(next)
    setExpandedMatch(null)
  }

  function removeSelection(matchId: number) {
    const next = new Map(selections)
    next.delete(matchId)
    setSelections(next)
  }

  async function loadMatchResultMarket(matchId: number) {
    setLoadingMarkets((prev) => {
      const next = new Set(prev)
      next.add(matchId)
      return next
    })
    try {
      const res = await fetch(`/api/markets/${matchId}`)
      if (res.ok) {
        const data = await res.json()
        const resultMarket = data.markets?.find((m: { type: string }) => m.type === "match_result")
        if (resultMarket?.outcomes) {
          setMarketCache((prev) => {
            const next = new Map(prev)
            next.set(matchId, resultMarket.outcomes as MarketOutcome[])
            return next
          })
        }
      }
    } catch {
      // Silently fallback — the match card just won't show market options
    } finally {
      setLoadingMarkets((prev) => {
        const next = new Set(prev)
        next.delete(matchId)
        return next
      })
    }
  }

  async function submit() {
    if (!canSubmit || selections.size < 2) return

    const betInputs: PlaceBetInput[] = []
    for (const s of selections.values()) {
      betInputs.push({
        matchId: s.matchId,
        marketType: s.marketType,
        label: `${s.homeTeam} - ${s.awayTeam}: ${s.outcome.label}`,
        selection: s.outcome.payload,
        odds: s.outcome.odds,
        stake: 0,
      })
    }

    setSubmitting(true)
    const res = await placeCombinedBet(betInputs, stake)
    setSubmitting(false)

    if (res.ok) {
      toast.success(`Pari combiné x${betInputs.length} placé avec succès !`)
      setSelectedMatchIds(new Set())
      setSelections(new Map())
      setExpandedMatch(null)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Match selection */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-gold" />
          <h3 className="font-heading text-lg text-card-foreground">Pari combiné</h3>
          {count >= 2 && (
            <Badge variant="default" className="ml-1 bg-gold/20 text-gold">
              x{count}
            </Badge>
          )}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Sélectionne 2 à 5 matchs. Pour chaque match, choisis le résultat (1X2). La cote combinée est le produit des
          cotes individuelles. Tous les matchs doivent être gagnants pour remporter le pari.
        </p>

        {availableMatches.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Aucun match à venir disponible pour un pari combiné.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {availableMatches.map((m) => {
              const isChecked = selectedMatchIds.has(m.id)
              const hasSelection = selections.has(m.id)
              const sel = selections.get(m.id)
              const outcomes = marketCache.get(m.id)
              const isLoading = loadingMarkets.has(m.id)
              const isExpanded = expandedMatch === m.id

              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-xl border transition-colors",
                    isChecked
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  {/* Match header row */}
                  <button
                    type="button"
                    onClick={() => toggleMatch(m.id)}
                    disabled={!isChecked && selectedMatchIds.size >= 5}
                    className="flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        isChecked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {isChecked && (
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="text-lg leading-none">
                        {flagForTeam(m.homeTeam, m.homeTeamCode)}
                      </span>
                      <span className="truncate text-sm font-medium text-card-foreground">
                        {m.homeTeam}
                      </span>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <span className="text-lg leading-none">
                        {flagForTeam(m.awayTeam, m.awayTeamCode)}
                      </span>
                      <span className="truncate text-sm font-medium text-card-foreground">
                        {m.awayTeam}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {hasSelection && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {sel!.outcome.label}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{kickoffLabel(m.kickoff)}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded market panel */}
                  {isExpanded && isChecked && (
                    <div className="border-t border-border px-3 pb-3 pt-2">
                      {isLoading ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">Chargement des cotes...</p>
                      ) : outcomes && outcomes.length > 0 ? (
                        <div className="flex gap-2">
                          {outcomes.map((o) => {
                            const isSelected = sel && sel.outcome.key === o.key
                            return (
                              <button
                                key={o.key}
                                type="button"
                                onClick={() => selectOutcome(m.id, `${m.homeTeam} - ${m.awayTeam}`, m.homeTeam, m.awayTeam, o)}
                                className={cn(
                                  "flex flex-1 items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-primary/40",
                                )}
                              >
                                <span>{o.label}</span>
                                <span className={cn("font-heading text-xs tabular", isSelected ? "text-primary" : "text-gold")}>
                                  {formatOdds(o.odds)}
                                </span>
                              </button>
                            )
                          })}
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
        )}

        {selectedMatchIds.size >= 5 && (
          <p className="mt-2 text-xs text-muted-foreground">Maximum 5 matchs pour un pari combiné.</p>
        )}
      </div>

      {/* Bet slip */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-heading text-base text-card-foreground">
              <Coins className="h-4 w-4 text-gold" />
              Ticket combiné
            </h3>
            {count > 0 && (
              <Badge variant="default" className="bg-gold/20 text-gold">
                x{count}
              </Badge>
            )}
          </div>

          {count === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Coche 2 à 5 matchs et choisis un résultat pour chacun.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Selected matches */}
              <div className="flex flex-col gap-2">
                {Array.from(selections.values()).map((s) => (
                  <div
                    key={s.matchId}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2"
                  >
                    <span className="flex-1 truncate text-xs text-card-foreground">
                      {s.matchLabel}
                    </span>
                    <span className="text-xs font-heading tabular text-gold">
                      {formatOdds(s.outcome.odds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removeSelection(s.matchId)
                        setSelectedMatchIds((prev) => {
                          const next = new Set(prev)
                          next.delete(s.matchId)
                          return next
                        })
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Supprimer ${s.matchLabel}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Combined odds */}
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Cote combinée</p>
                <p className="font-heading text-2xl tabular text-gold">{formatOdds(combinedOdds)}</p>
              </div>

              {/* Stake input */}
              <div>
                <label htmlFor="combined-stake" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Mise (€)
                </label>
                <Input
                  id="combined-stake"
                  type="number"
                  min={1}
                  max={balance}
                  value={stake}
                  onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value))))}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[25, 50, 100, 250].map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={q > balance}
                      onClick={() => setStake(q)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                    >
                      {q}€
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStake(balance)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Payout summary */}
              {count >= 2 && (
                <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gain net potentiel</span>
                    <span className="tabular text-primary">+{formatMoney(netProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retour total</span>
                    <span className="font-heading tabular text-gold">{formatMoney(potentialPayout)}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={submit}
                disabled={!canSubmit || submitting}
                className="w-full font-medium"
              >
                {submitting
                  ? "Validation..."
                  : `Parier ${formatMoney(Math.max(0, Math.floor(stake)))} (combiné x${count})`}
              </Button>

              {count === 1 && (
                <p className="text-center text-xs text-muted-foreground">
                  Ajoute au moins un autre match (2 minimum).
                </p>
              )}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Solde dispo : <span className="tabular text-foreground">{formatMoney(balance)}</span>
          </p>
        </div>
      </aside>
    </div>
  )
}
