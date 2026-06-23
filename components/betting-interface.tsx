"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { formatMoney, formatOdds } from "@/lib/format"
import { MARKET_LABELS, scorerMinuteRangeOdds, type Market, type MarketType } from "@/lib/markets"
import { placeBet } from "@/app/actions/bets"
import { Coins, Target, Timer, X, Sparkles } from "lucide-react"

type Selection = {
  marketType: MarketType
  label: string
  odds: number
  payload: Record<string, unknown>
  minuteFrom?: number
  minuteTo?: number
}

const TAB_ORDER: MarketType[] = [
  "match_result",
  "double_chance",
  "totals",
  "btts",
  "correct_score",
  "anytime_scorer",
  "first_scorer",
  "scorer_minute_range",
]

export function BettingInterface({
  matchId,
  markets,
  balance,
  canBet,
}: {
  matchId: number
  markets: Market[]
  balance: number
  canBet: boolean
}) {
  const router = useRouter()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [stake, setStake] = useState<number>(50)
  const [submitting, setSubmitting] = useState(false)

  const marketByType = useMemo(() => {
    const map = new Map<MarketType, Market>()
    for (const m of markets) map.set(m.type, m)
    return map
  }, [markets])

  const availableTabs = TAB_ORDER.filter((t) => marketByType.has(t) || t === "scorer_minute_range")
  const scorerMarket = marketByType.get("anytime_scorer")

  function pick(marketType: MarketType, label: string, odds: number, payload: Record<string, unknown>) {
    setSelection({ marketType, label, odds, payload })
  }

  async function submit() {
    if (!selection) return
    const s = Math.floor(stake)
    if (s <= 0) return toast.error("Entre une mise valide.")
    if (s > balance) return toast.error("Solde insuffisant.")

    setSubmitting(true)
    const res = await placeBet({
      matchId,
      marketType: selection.marketType,
      label: selection.label,
      selection: selection.payload,
      odds: selection.odds,
      stake: s,
      minuteFrom: selection.minuteFrom ?? null,
      minuteTo: selection.minuteTo ?? null,
    })
    setSubmitting(false)

    if (res.ok) {
      toast.success(`Pari placé : ${formatMoney(s)} sur "${selection.label}"`)
      setSelection(null)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-primary/20 bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Coins className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h3 className="font-heading text-base text-card-foreground">Zone de paris</h3>
            <p className="text-xs text-muted-foreground">Choisis un marché et une sélection</p>
          </div>
        </div>

        {!canBet && (
          <div className="mb-4 rounded-xl border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
            Les paris sont fermés pour ce match (il a commencé ou est terminé).
          </div>
        )}

        <div className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none flex-nowrap pb-1">
          {availableTabs.map((t) => {
            const active = selection?.marketType === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelection(null)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {MARKET_LABELS[t as MarketType] ?? t}
              </button>
            )
          })}
        </div>

        {selection?.marketType === "scorer_minute_range" ? (
          <ScorerMinuteRange
            scorerMarket={scorerMarket}
            disabled={!canBet}
            current={selection}
            onPick={(sel) => setSelection(sel)}
          />
        ) : (
          <OutcomeGrid
            market={marketByType.get((selection?.marketType as MarketType) ?? availableTabs[0])}
            disabled={!canBet}
            selectedKey={
              selection ? String(selection.payload.__key ?? selection.label) : null
            }
            onPick={pick}
          />
        )}
      </div>

      <BetSlip
        selection={selection}
        stake={stake}
        balance={balance}
        canBet={canBet}
        submitting={submitting}
        onStake={setStake}
        onClear={() => setSelection(null)}
        onSubmit={submit}
      />
    </div>
  )
}

function OutcomeGrid({
  market,
  disabled,
  selectedKey,
  onPick,
}: {
  market?: Market
  disabled: boolean
  selectedKey: string | null
  onPick: (marketType: MarketType, label: string, odds: number, payload: Record<string, unknown>) => void
}) {
  if (!market) return null

  return (
    <div className="flex flex-col gap-1.5">
      {market.outcomes.map((o) => {
        const active = selectedKey === o.key
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(market.type, `${MARKET_LABELS[market.type]}: ${o.label}`, o.odds, { ...o.payload, __key: o.key })}
            className={cn(
              "flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all disabled:opacity-40",
              active
                ? "bg-primary/10 border border-primary/50"
                : "bg-card border border-border hover:border-primary/30 hover:bg-secondary/30",
            )}
          >
            <span className="text-sm font-medium text-card-foreground">{o.label}</span>
            <span className={cn(
              "font-heading text-lg tabular",
              active ? "text-primary" : "text-gold"
            )}>
              {formatOdds(o.odds)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ScorerMinuteRange({
  scorerMarket,
  disabled,
  current,
  onPick,
}: {
  scorerMarket?: Market
  disabled: boolean
  current: Selection | null
  onPick: (sel: Selection) => void
}) {
  const players = scorerMarket?.outcomes ?? []
  const [player, setPlayer] = useState<string>(players[0]?.key ?? "")
  const [range, setRange] = useState<[number, number]>([20, 40])

  const baseOdds = players.find((p) => p.key === player)?.odds ?? 0
  const derivedOdds = baseOdds ? scorerMinuteRangeOdds(baseOdds, range[0], range[1]) : 0

  if (!scorerMarket || players.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun buteur disponible pour ce match.</p>
  }

  function confirm() {
    if (!player || !derivedOdds) return
    onPick({
      marketType: "scorer_minute_range",
      label: `Buteur ${player} entre la ${range[0]}e et ${range[1]}e min`,
      odds: derivedOdds,
      payload: { player },
      minuteFrom: range[0],
      minuteTo: range[1],
    })
  }

  const isCurrent = current?.marketType === "scorer_minute_range" && current.payload.player === player

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 text-gold" />
        <p className="text-sm text-muted-foreground text-pretty">
          Choisis un buteur et une tranche de minutes. Plus la fenêtre est précise, plus la cote (et le gain potentiel)
          grimpe.
        </p>
      </div>

      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        <Target className="mr-1 inline h-3.5 w-3.5" />
        Buteur
      </label>
      <div className="relative mb-4">
        <select
          value={player}
          onChange={e => setPlayer(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        >
          {players.map((p) => (
            <option key={p.key} value={p.key}>{p.label} — ×{formatOdds(p.odds)}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          <Timer className="mr-1 inline h-3.5 w-3.5" />
          Tranche de minutes
        </label>
        <span className="font-heading text-sm tabular text-foreground">
          {range[0]}&apos; – {range[1]}&apos;
        </span>
      </div>
      <Slider
        value={range}
        min={0}
        max={90}
        step={1}
        minStepsBetweenValues={1}
        disabled={disabled}
        onValueChange={(v) => {
          const arr = Array.isArray(v) ? v : [v]
          setRange([arr[0] ?? 0, arr[1] ?? 90] as [number, number])
        }}
        className="mb-4"
      />

      <div className="mb-4 flex items-center justify-between rounded-xl bg-secondary/60 p-3">
        <div className="text-xs text-muted-foreground">
          <p>
            Cote buteur seul : <span className="tabular text-foreground">{formatOdds(baseOdds)}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1">
            Cote buteur + tranche :{" "}
            <span className="font-heading tabular text-gold">{formatOdds(derivedOdds)}</span>
          </p>
        </div>
        <Button type="button" size="sm" disabled={disabled || isCurrent} onClick={confirm}>
          {isCurrent ? "Sélectionné" : "Choisir"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        La cote &quot;buteur + tranche&quot; est toujours supérieure à la cote &quot;buteur seul&quot;.
      </p>
    </div>
  )
}

function BetSlip({
  selection,
  stake,
  balance,
  canBet,
  submitting,
  onStake,
  onClear,
  onSubmit,
}: {
  selection: Selection | null
  stake: number
  balance: number
  canBet: boolean
  submitting: boolean
  onStake: (n: number) => void
  onClear: () => void
  onSubmit: () => void
}) {
  const payout = selection ? Math.round(stake * selection.odds) : 0
  const profit = selection ? Math.round(stake * (selection.odds - 1)) : 0
  const quick = [25, 50, 100, 250]

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-heading text-base text-card-foreground">
            <Coins className="h-4 w-4 text-gold" />
            Ticket de pari
          </h3>
          {selection && (
            <button onClick={onClear} className="text-muted-foreground hover:text-foreground" aria-label="Vider le ticket">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!selection ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sélectionne un pari pour le voir apparaître ici.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="text-sm text-card-foreground text-pretty">{selection.label}</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Cote</span>
                <span className="font-heading text-2xl tabular text-gold">{formatOdds(selection.odds)}</span>
              </p>
            </div>

            <div>
              <label htmlFor="stake" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Mise (€)
              </label>
              <Input
                id="stake"
                type="number"
                min={1}
                max={balance}
                value={stake}
                onChange={(e) => onStake(Number(e.target.value))}
                disabled={!canBet}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quick.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={!canBet || q > balance}
                    onClick={() => onStake(q)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                  >
                    {q}€
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!canBet}
                  onClick={() => onStake(balance)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Gain net potentiel</span>
                <span className="tabular text-primary">+{formatMoney(profit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retour total</span>
                <span className="font-heading tabular text-gold">{formatMoney(payout)}</span>
              </div>
            </div>

            <Button onClick={onSubmit} disabled={!canBet || submitting || stake <= 0} className="w-full font-medium">
              {submitting ? "Validation..." : `Parier ${formatMoney(Math.max(0, Math.floor(stake)))}`}
            </Button>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Solde dispo : <span className="tabular text-foreground">{formatMoney(balance)}</span>
        </p>
      </div>
    </aside>
  )
}
