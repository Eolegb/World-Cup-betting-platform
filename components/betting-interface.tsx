"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { formatMoney, formatOdds } from "@/lib/format"
import { MARKET_LABELS, scorerMinuteRangeOdds, correctScoreOdds, type Market, type MarketType } from "@/lib/markets"
import { placeBet } from "@/app/actions/bets"
import { flagForTeam } from "@/lib/flags"
import { teamColors } from "@/lib/team-colors"
import { Coins, Target, Timer, X, Sparkles, ChevronDown } from "lucide-react"

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
  homeTeam,
  awayTeam,
}: {
  matchId: number
  markets: Market[]
  balance: number
  canBet: boolean
  homeTeam: string
  awayTeam: string
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
  const [activeTab, setActiveTab] = useState<string>(availableTabs[0] ?? "")
  const scorerMarket = marketByType.get("anytime_scorer")
  const homeFlag = flagForTeam(homeTeam)
  const awayFlag = flagForTeam(awayTeam)
  const homeColors = teamColors(homeTeam)
  const awayColors = teamColors(awayTeam)

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
      <div className="rounded-2xl border border-border/50 glass p-4 sm:p-6">
        <div className="mb-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">{homeFlag}</span>
              <span className="text-xs font-medium text-card-foreground text-center leading-tight">{homeTeam}</span>
            </div>
            <span className="text-xl font-heading text-muted-foreground">VS</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">{awayFlag}</span>
              <span className="text-xs font-medium text-card-foreground text-center leading-tight">{awayTeam}</span>
            </div>
          </div>
        </div>

        {!canBet && (
          <div className="mb-4 rounded-xl border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
            Les paris sont fermés pour ce match (il a commencé ou est terminé).
          </div>
        )}

        <div className="relative mb-4">
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            disabled={!canBet}
            className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          >
            {availableTabs.map((t) => (
              <option key={t} value={t}>{MARKET_LABELS[t as MarketType] ?? t}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>

        {activeTab === "correct_score" ? (
          <ScorePicker
            disabled={!canBet}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            homeFlag={homeFlag}
            awayFlag={awayFlag}
            selectedHome={
              selection && selection.marketType === "correct_score"
                ? Number(selection.payload.home)
                : -1
            }
            selectedAway={
              selection && selection.marketType === "correct_score"
                ? Number(selection.payload.away)
                : -1
            }
            onPick={(h, a) => {
              const odd = correctScoreOdds(h, a)
              pick("correct_score", `${homeTeam} ${h} - ${a} ${awayTeam}`, odd, { home: h, away: a })
            }}
          />
        ) : activeTab === "scorer_minute_range" ? (
          <ScorerMinuteRange
            scorerMarket={scorerMarket}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            disabled={!canBet}
            current={selection}
            onPick={(sel) => setSelection(sel)}
          />
        ) : activeTab === "anytime_scorer" || activeTab === "first_scorer" ? (
          <ScorerSelect
            market={marketByType.get(activeTab as MarketType)}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            homeFlag={homeFlag}
            awayFlag={awayFlag}
            disabled={!canBet}
            selectedKey={
              selection && selection.marketType === activeTab
                ? String(selection.payload.__key ?? selection.label)
                : ""
            }
            onPick={pick}
          />
        ) : (
          <OutcomeGrid
            market={marketByType.get(activeTab as MarketType)}
            disabled={!canBet}
            selectedKey={
              selection && selection.marketType === activeTab
                ? String(selection.payload.__key ?? selection.label)
                : null
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

  const horizontalLayouts = ["match_result", "double_chance", "totals", "btts"]
  const isHorizontal = horizontalLayouts.includes(market.type)
  const gridClass = market.outcomes.length === 2 ? "grid-cols-2" : "grid-cols-3"

  return (
    <div className={isHorizontal ? `grid ${gridClass} gap-1.5` : "flex flex-col gap-1.5"}>
      {market.outcomes.map((o) => {
        const active = selectedKey === o.key
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(market.type, `${MARKET_LABELS[market.type]}: ${o.label}`, o.odds, { ...o.payload, __key: o.key })}
            className={cn(
              isHorizontal
                ? "flex flex-col items-center justify-center rounded-xl px-2 py-3 text-center transition-all disabled:opacity-40 gap-1"
                : "flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all disabled:opacity-40",
              active
                ? "bg-primary/10 border border-primary/50"
                : "bg-card border border-border hover:border-primary/30 hover:bg-secondary/30",
            )}
          >
            <span className={cn("font-medium text-card-foreground", isHorizontal ? "text-xs leading-tight text-center" : "text-sm")}>
              {o.label}
            </span>
            <span className={cn(
              "font-heading tabular",
              isHorizontal ? "text-base" : "text-lg",
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

function ScorePicker({
  disabled,
  homeTeam,
  awayTeam,
  homeFlag,
  awayFlag,
  selectedHome,
  selectedAway,
  onPick,
}: {
  disabled: boolean
  homeTeam: string
  awayTeam: string
  homeFlag: string
  awayFlag: string
  selectedHome: number
  selectedAway: number
  onPick: (home: number, away: number) => void
}) {
  const [h, setH] = useState(selectedHome >= 0 ? selectedHome : -1)
  const [a, setA] = useState(selectedAway >= 0 ? selectedAway : -1)

  function updateHome(val: number) { setH(val); if (a >= 0) onPick(val, a) }
  function updateAway(val: number) { setA(val); if (h >= 0) onPick(h, val) }

  const hasScore = h >= 0 && a >= 0
  const odds = hasScore ? correctScoreOdds(h, a) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground text-center">
            {homeFlag} {homeTeam}
          </p>
          <select
            value={h}
            onChange={e => updateHome(Number(e.target.value))}
            disabled={disabled}
            className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value={-1}>—</option>
            {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <span className="text-muted-foreground text-lg font-heading shrink-0 mt-5">-</span>
        <div className="flex-1">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground text-center">
            {awayFlag} {awayTeam}
          </p>
          <select
            value={a}
            onChange={e => updateAway(Number(e.target.value))}
            disabled={disabled}
            className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value={-1}>—</option>
            {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      {hasScore && (
        <div className={cn(
          "flex items-center justify-between rounded-xl px-4 py-3",
          selectedHome === h && selectedAway === a
            ? "bg-primary/10 border border-primary/50"
            : "bg-card border border-border"
        )}>
          <span className="text-sm font-medium text-card-foreground">
            {homeTeam} {h} - {a} {awayTeam}
          </span>
          <span className={cn(
            "font-heading text-lg tabular",
            selectedHome === h && selectedAway === a ? "text-primary" : "text-gold"
          )}>
            {formatOdds(odds)}
          </span>
        </div>
      )}
    </div>
  )
}

function ScorerSelect({
  market,
  homeTeam,
  awayTeam,
  homeFlag,
  awayFlag,
  disabled,
  selectedKey,
  onPick,
}: {
  market?: Market
  homeTeam: string
  awayTeam: string
  homeFlag: string
  awayFlag: string
  disabled: boolean
  selectedKey: string | null
  onPick: (marketType: MarketType, label: string, odds: number, payload: Record<string, unknown>) => void
}) {
  if (!market) return null

  const homePlayers = market.outcomes.filter(o => String(o.payload.team) === "home")
  const awayPlayers = market.outcomes.filter(o => String(o.payload.team) === "away")
  const others = market.outcomes.filter(o => String(o.payload.team) !== "home" && String(o.payload.team) !== "away")

  return (
    <div className="relative">
      <select
        value={selectedKey ?? ""}
        disabled={disabled}
        onChange={e => {
          const o = market.outcomes.find(o => o.key === e.target.value)
          if (o) onPick(market.type, `${MARKET_LABELS[market.type]}: ${o.label}`, o.odds, { ...o.payload, __key: o.key })
        }}
        className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
      >
        <option value="">— Choisir un joueur —</option>
        {homePlayers.length > 0 && (
          <optgroup label={`${homeFlag} ${homeTeam}`}>
            {homePlayers.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </optgroup>
        )}
        {awayPlayers.length > 0 && (
          <optgroup label={`${awayFlag} ${awayTeam}`}>
            {awayPlayers.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </optgroup>
        )}
        {others.map(o => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </div>
  )
}

function ScorerMinuteRange({
  scorerMarket,
  homeTeam,
  awayTeam,
  disabled,
  current,
  onPick,
}: {
  scorerMarket?: Market
  homeTeam: string
  awayTeam: string
  disabled: boolean
  current: Selection | null
  onPick: (sel: Selection) => void
}) {
  const players = scorerMarket?.outcomes ?? []
  const [player, setPlayer] = useState<string>(players[0]?.key ?? "")
  const [range, setRange] = useState<[number, number]>([20, 40])

  const baseOdds = players.find((p) => p.key === player)?.odds ?? 0
  const derivedOdds = baseOdds ? scorerMinuteRangeOdds(baseOdds, range[0], range[1]) : 0

  const homePlayers = players.filter(o => String(o.payload.team) === "home")
  const awayPlayers = players.filter(o => String(o.payload.team) === "away")
  const others = players.filter(o => String(o.payload.team) !== "home" && String(o.payload.team) !== "away")
  const homeFlag = flagForTeam(homeTeam)
  const awayFlag = flagForTeam(awayTeam)

  if (players.length === 0) {
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
          Choisis un buteur et une tranche de minutes. Plus la fenêtre est précise, plus la cote grimpe.
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
          {homePlayers.length > 0 && (
            <optgroup label={`${homeFlag} ${homeTeam}`}>
              {homePlayers.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </optgroup>
          )}
          {awayPlayers.length > 0 && (
            <optgroup label={`${awayFlag} ${awayTeam}`}>
              {awayPlayers.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </optgroup>
          )}
          {others.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
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
