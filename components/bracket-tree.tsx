"use client"

import { cn } from "@/lib/utils"
import { flagForTeam } from "@/lib/flags"
import { kickoffTime } from "@/lib/datetime"
import type { BracketData, BracketSlot } from "@/lib/bracket"
import { Trophy } from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortName(name: string): string {
  if (name.length <= 14) return name
  return name.slice(0, 12) + "…"
}

// ── Card dimensions ───────────────────────────────────────────────────────────
const CARD_W = 148
const CARD_H = 62
const CARD_W_LARGE = 164
const CARD_H_LARGE = 72
const LABEL_H = 28 // hauteur de la ligne de titre de round (H / QF / SF / F)
const BASE_GAP = 8 // espacement du tout premier round (le plus rempli)
const FINAL_HEADER_H = 56 // hauteur trophée + libellé "Finale" au-dessus de la carte

// ── Géométrie du bracket ──────────────────────────────────────────────────────
// Calcule, pour chaque round, l'écart vertical entre cartes ET le décalage en
// haut de colonne nécessaire pour que chaque round s'aligne exactement sur le
// milieu de la paire du round précédent (sinon les lignes ne tombent jamais
// pile sur les cartes suivantes).
function buildGeometry(roundCount: number, baseGap = BASE_GAP) {
  const gaps: number[] = []
  const offsets: number[] = []

  for (let i = 0; i < roundCount; i++) {
    if (i === 0) {
      gaps.push(baseGap)
      offsets.push(0)
      continue
    }
    const prevGap = gaps[i - 1]
    const prevOffset = offsets[i - 1]
    const prevPitch = CARD_H + prevGap
    gaps.push(CARD_H + 2 * prevGap)
    offsets.push(prevOffset + prevPitch / 2)
  }

  const lastGap = gaps[roundCount - 1] ?? baseGap
  const lastOffset = offsets[roundCount - 1] ?? 0
  // Position théorique d'un "round suivant" à 1 seule carte (= la Finale)
  const finalCenterOffset = lastOffset + (CARD_H + lastGap) / 2

  return { gaps, offsets, finalCenterOffset }
}

// ── MatchSlot ────────────────────────────────────────────────────────────────

function MatchSlot({
  slot,
  isWinner,
  size = "normal",
}: {
  slot: BracketSlot
  isWinner: boolean
  size?: "normal" | "large"
}) {
  const m = slot.match
  const w = size === "large" ? CARD_W_LARGE : CARD_W
  const h = size === "large" ? CARD_H_LARGE : CARD_H

  if (!m) {
    return (
      <div
        className="rounded-xl border border-dashed border-border/40 bg-background/40 flex items-center justify-center"
        style={{ width: w, height: h }}
      >
        <span className="text-[11px] text-muted-foreground/45 tracking-widest">?</span>
      </div>
    )
  }

  const homeWin = m.status === "finished" && m.homeScore > m.awayScore
  const awayWin = m.status === "finished" && m.awayScore > m.homeScore
  const isLive = m.status === "live"
  const hasScore = m.status === "live" || m.status === "finished"

  return (
    <div
      className={cn(
        "rounded-xl border bg-card backdrop-blur-sm transition-all duration-200 overflow-hidden flex flex-col justify-between",
        isWinner
          ? "border-amber-500/60 shadow-[0_0_16px_rgba(245,158,11,0.2),inset_0_0_0_1px_rgba(245,158,11,0.12)]"
          : "border-border/50 hover:border-border/70",
        isLive && "border-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.18)]",
      )}
      style={{ width: w, height: h }}
    >
      {/* Home row */}
      <div className={cn("flex items-center gap-1.5 px-2.5 pt-2", homeWin && "bg-amber-500/10")}>
        <span className="text-sm leading-none shrink-0">{flagForTeam(m.homeTeam, m.homeTeamCode)}</span>
        <span
          className={cn(
            "text-[12px] flex-1 leading-tight min-w-0 truncate",
            homeWin ? "font-semibold text-foreground" : hasScore ? "text-muted-foreground/80" : "text-foreground",
          )}
        >
          {shortName(m.homeTeam)}
        </span>
        {hasScore && (
          <span className={cn("text-[13px] font-mono tabular-nums shrink-0 ml-1", homeWin ? "font-bold text-amber-400" : "text-foreground/70")}>
            {m.homeScore}
          </span>
        )}
      </div>

      <div className="mx-2.5 border-t border-border/25" />

      {/* Away row */}
      <div className={cn("flex items-center gap-1.5 px-2.5 pb-2", awayWin && "bg-amber-500/10")}>
        <span className="text-sm leading-none shrink-0">{flagForTeam(m.awayTeam, m.awayTeamCode)}</span>
        <span
          className={cn(
            "text-[12px] flex-1 leading-tight min-w-0 truncate",
            awayWin ? "font-semibold text-foreground" : hasScore ? "text-muted-foreground/80" : "text-foreground",
          )}
        >
          {shortName(m.awayTeam)}
        </span>
        {hasScore && (
          <span className={cn("text-[13px] font-mono tabular-nums shrink-0 ml-1", awayWin ? "font-bold text-amber-400" : "text-foreground/70")}>
            {m.awayScore}
          </span>
        )}
      </div>

      {/* Status bar */}
      <div className="px-2.5 pb-1.5 flex justify-between items-center">
        <span className="text-[9px] text-muted-foreground/55 font-mono">#{slot.wc26MatchId}</span>
        {m.status === "scheduled" && (
          <span className="text-[9px] text-muted-foreground/65">{kickoffTime(m.kickoff)}</span>
        )}
        {isLive && (
          <span className="inline-flex items-center gap-1 text-[9px] text-green-400 font-semibold tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        )}
        {m.status === "finished" && <span className="text-[9px] text-muted-foreground/55">FT</span>}
      </div>
    </div>
  )
}

// ── Round label colors ────────────────────────────────────────────────────────

const ROUND_COLORS: Record<string, string> = {
  H: "text-sky-300/80",
  QF: "text-blue-400/85",
  SF: "text-purple-400/90",
  F: "text-amber-400/90",
}

// ── Connector SVG ─────────────────────────────────────────────────────────────

function ConnectorLines({
  slots,
  side,
  gap,
  offsetTop,
}: {
  slots: BracketSlot[]
  side: "left" | "right"
  gap: number
  offsetTop: number
}) {
  if (slots.length < 2) return null

  const pairs = Math.floor(slots.length / 2)
  const svgH = slots.length * (CARD_H + gap) - gap
  const svgW = 20
  const lines: React.ReactNode[] = []

  for (let i = 0; i < pairs; i++) {
    const topY = i * 2 * (CARD_H + gap) + CARD_H / 2
    const botY = (i * 2 + 1) * (CARD_H + gap) + CARD_H / 2
    const midY = (topY + botY) / 2
    const x0 = side === "left" ? 0 : svgW
    const x1 = side === "left" ? svgW : 0

    lines.push(
      <g key={i}>
        <line x1={x0} y1={topY} x2={svgW / 2} y2={topY} stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <line x1={x0} y1={botY} x2={svgW / 2} y2={botY} stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <line x1={svgW / 2} y1={topY} x2={svgW / 2} y2={botY} stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <line x1={svgW / 2} y1={midY} x2={x1} y2={midY} stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      </g>,
    )
  }

  return (
    <svg width={svgW} height={svgH} className="text-foreground shrink-0" style={{ marginTop: LABEL_H + offsetTop }}>
      {lines}
    </svg>
  )
}

// ── Bracket Column ────────────────────────────────────────────────────────────

function BracketColumn({
  slots,
  shortName: roundShort,
  gap,
  offsetTop,
}: {
  slots: BracketSlot[]
  shortName: string
  gap: number
  offsetTop: number
}) {
  if (slots.length === 0) return null
  const colorClass = ROUND_COLORS[roundShort] ?? "text-muted-foreground/70"

  return (
    <div className="flex flex-col items-center gap-0">
      <div style={{ height: LABEL_H }} className="flex items-center">
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", colorClass)}>{roundShort}</span>
      </div>
      <div className="flex flex-col" style={{ gap, marginTop: offsetTop }}>
        {slots.map((slot) => (
          <MatchSlot
            key={slot.wc26MatchId}
            slot={slot}
            isWinner={!!slot.match && slot.match.status === "finished"}
          />
        ))}
      </div>
    </div>
  )
}

// ── Half Bracket ──────────────────────────────────────────────────────────────

function HalfBracket({
  half,
  side,
}: {
  half: BracketData["left"]
  side: "left" | "right"
}) {
  if (half.rounds.length === 0) return null

  const { gaps, offsets } = buildGeometry(half.rounds.length)
  const order =
    side === "left"
      ? half.rounds.map((_, i) => i)
      : half.rounds.map((_, i) => i).reverse()

  return (
    <div className="flex items-start">
      {order.map((i, pos) => {
        const round = half.rounds[i]
        const hasNext = pos < order.length - 1
        const connectorIdx = side === "left" ? order[pos] : order[pos + 1]

        return (
          <div key={i} className="flex items-start">
            <BracketColumn
              slots={round.slots}
              shortName={round.shortName}
              gap={gaps[i]}
              offsetTop={offsets[i]}
            />
            {hasNext && (
              <ConnectorLines
                slots={half.rounds[connectorIdx].slots}
                gap={gaps[connectorIdx]}
                offsetTop={offsets[connectorIdx]}
                side={side}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Center (Final only) ───────────────────────────────────────────────────────

function CenterFinal({
  finalSlot,
  finalCenterY,
}: {
  finalSlot: BracketData["final"]
  finalCenterY: number
}) {
  if (!finalSlot) return null

  const groupMarginTop = Math.max(0, (finalCenterY - FINAL_HEADER_H - CARD_H_LARGE / 2) / 2)

  return (
    <div className="flex flex-col items-center shrink-0 px-3" style={{ marginTop: groupMarginTop }}>
      <div className="relative">
        <div className="absolute inset-0 blur-md bg-amber-500/25 rounded-full" />
        <Trophy className="relative h-6 w-6 text-amber-400" />
      </div>
      <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-400/90">Finale</span>
      <div className="mt-2 rounded-xl border-2 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.18)] overflow-hidden">
        <MatchSlot slot={finalSlot} isWinner={false} size="large" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BracketTree({ data }: { data: BracketData }) {
  const { left, right, final: finalSlot } = data

  if (left.rounds.length === 0 && right.rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-amber-500/15 rounded-full" />
          <Trophy className="relative h-12 w-12 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground/60 text-center max-w-xs">
          Les matchs à élimination directe apparaîtront ici après la phase de groupes.
        </p>
      </div>
    )
  }

  // Géométrie de référence pour centrer la finale
  const refHalf = left.rounds.length > 0 ? left : right
  const refGeometry = buildGeometry(refHalf.rounds.length)
  const finalCenterY = LABEL_H + refGeometry.finalCenterOffset

  // Connecteur SF → Finale (un par côté, une seule fois chacun)
  const leftLastIdx = left.rounds.length - 1
  const rightLastIdx = right.rounds.length - 1

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex items-start justify-center min-w-max py-4 gap-0">
        <HalfBracket half={left} side="left" />

        {left.rounds.length > 0 && (
          <ConnectorLines
            slots={left.rounds[leftLastIdx].slots}
            gap={refGeometry.gaps[leftLastIdx]}
            offsetTop={refGeometry.offsets[leftLastIdx]}
            side="left"
          />
        )}

        <CenterFinal finalSlot={finalSlot} finalCenterY={finalCenterY} />

        {right.rounds.length > 0 && (
          <ConnectorLines
            slots={right.rounds[rightLastIdx].slots}
            gap={refGeometry.gaps[rightLastIdx]}
            offsetTop={refGeometry.offsets[rightLastIdx]}
            side="right"
          />
        )}

        <HalfBracket half={right} side="right" />
      </div>
    </div>
  )
}
