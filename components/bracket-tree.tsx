"use client"

import { cn } from "@/lib/utils"
import { flagForTeam } from "@/lib/flags"
import { kickoffTime } from "@/lib/datetime"
import type { BracketData, BracketSlot } from "@/lib/bracket"
import { Trophy, Medal } from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortName(name: string): string {
  if (name.length <= 14) return name
  return name.slice(0, 12) + "…"
}

// ── Card dimensions (used for SVG connector math) ────────────────────────────
const CARD_W = 148
const CARD_H = 62

// ── MatchSlot ────────────────────────────────────────────────────────────────

function MatchSlot({
  slot,
  isWinner,
  side,
  size = "normal",
}: {
  slot: BracketSlot
  isWinner: boolean
  side: "left" | "right" | "center"
  size?: "normal" | "large"
}) {
  const m = slot.match

  if (!m) {
    return (
      <div
        className="rounded-xl border border-dashed border-border/25 bg-background/30 flex items-center justify-center"
        style={{ width: size === "large" ? 164 : CARD_W, height: size === "large" ? 72 : CARD_H }}
      >
        <span className="text-[11px] text-muted-foreground/30 tracking-widest">?</span>
      </div>
    )
  }

  const homeWin = m.status === "finished" && m.homeScore > m.awayScore
  const awayWin = m.status === "finished" && m.awayScore > m.homeScore
  const isLive = m.status === "live"
  const hasScore = m.status === "live" || m.status === "finished"
  const w = size === "large" ? 164 : CARD_W
  const h = size === "large" ? 72 : CARD_H

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/80 backdrop-blur-sm transition-all duration-200 overflow-hidden flex flex-col justify-between",
        isWinner
          ? "border-amber-500/50 shadow-[0_0_16px_rgba(245,158,11,0.15),inset_0_0_0_1px_rgba(245,158,11,0.08)]"
          : "border-border/30 hover:border-border/50",
        isLive && "border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
      )}
      style={{ width: w, height: h }}
    >
      {/* Home row */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 pt-2",
          homeWin && "bg-amber-500/5",
        )}
      >
        <span className="text-sm leading-none shrink-0">{flagForTeam(m.homeTeam, m.homeTeamCode)}</span>
        <span
          className={cn(
            "text-[12px] flex-1 leading-tight min-w-0 truncate",
            homeWin ? "font-semibold text-foreground" : hasScore ? "text-muted-foreground/60" : "text-foreground/90",
          )}
        >
          {shortName(m.homeTeam)}
        </span>
        {hasScore && (
          <span className={cn("text-[13px] font-mono tabular-nums shrink-0 ml-1", homeWin && "font-bold text-amber-400")}>
            {m.homeScore}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mx-2.5 border-t border-border/15" />

      {/* Away row */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 pb-2",
          awayWin && "bg-amber-500/5",
        )}
      >
        <span className="text-sm leading-none shrink-0">{flagForTeam(m.awayTeam, m.awayTeamCode)}</span>
        <span
          className={cn(
            "text-[12px] flex-1 leading-tight min-w-0 truncate",
            awayWin ? "font-semibold text-foreground" : hasScore ? "text-muted-foreground/60" : "text-foreground/90",
          )}
        >
          {shortName(m.awayTeam)}
        </span>
        {hasScore && (
          <span className={cn("text-[13px] font-mono tabular-nums shrink-0 ml-1", awayWin && "font-bold text-amber-400")}>
            {m.awayScore}
          </span>
        )}
      </div>

      {/* Status bar */}
      <div className={cn(
        "px-2.5 pb-1.5 flex justify-between items-center",
      )}>
        <span className="text-[9px] text-muted-foreground/40 font-mono">#{slot.wc26MatchId}</span>
        {m.status === "scheduled" && (
          <span className="text-[9px] text-muted-foreground/50">{kickoffTime(m.kickoff)}</span>
        )}
        {isLive && (
          <span className="inline-flex items-center gap-1 text-[9px] text-green-400 font-semibold tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        )}
        {m.status === "finished" && (
          <span className="text-[9px] text-muted-foreground/40">FT</span>
        )}
      </div>
    </div>
  )
}

// ── Round label ───────────────────────────────────────────────────────────────

const ROUND_COLORS: Record<string, string> = {
  "Huitièmes": "text-muted-foreground/50",
  "Quarts": "text-blue-400/60",
  "Demies": "text-purple-400/70",
  "Finale": "text-amber-400/80",
  "H": "text-muted-foreground/50",
  "QF": "text-blue-400/60",
  "SF": "text-purple-400/70",
  "F": "text-amber-400/80",
}

// ── Connector SVG ─────────────────────────────────────────────────────────────
// Draws bracket lines between a column of slots and the next round's slots

function ConnectorLines({
  slots,
  side,
  cardH,
  gap,
}: {
  slots: BracketSlot[]
  side: "left" | "right"
  cardH: number
  gap: number
}) {
  if (slots.length < 2) return null

  // Each pair of adjacent slots feeds one match in the next round
  const pairs = Math.floor(slots.length / 2)
  const svgH = slots.length * (cardH + gap) - gap
  const svgW = 20

  const lines: React.ReactNode[] = []

  for (let i = 0; i < pairs; i++) {
    const topIdx = i * 2
    const botIdx = i * 2 + 1
    // y-center of top card
    const topY = topIdx * (cardH + gap) + cardH / 2
    // y-center of bottom card
    const botY = botIdx * (cardH + gap) + cardH / 2
    // midpoint
    const midY = (topY + botY) / 2

    const x0 = side === "left" ? 0 : svgW
    const x1 = side === "left" ? svgW : 0

    lines.push(
      <g key={i}>
        {/* Top horizontal stub */}
        <line
          x1={x0} y1={topY}
          x2={svgW / 2} y2={topY}
          stroke="currentColor" strokeWidth="1" opacity="0.2"
        />
        {/* Bottom horizontal stub */}
        <line
          x1={x0} y1={botY}
          x2={svgW / 2} y2={botY}
          stroke="currentColor" strokeWidth="1" opacity="0.2"
        />
        {/* Vertical connector */}
        <line
          x1={svgW / 2} y1={topY}
          x2={svgW / 2} y2={botY}
          stroke="currentColor" strokeWidth="1" opacity="0.2"
        />
        {/* Output stub to next card */}
        <line
          x1={svgW / 2} y1={midY}
          x2={x1} y2={midY}
          stroke="currentColor" strokeWidth="1" opacity="0.2"
        />
      </g>
    )
  }

  return (
    <svg
      width={svgW}
      height={svgH}
      className="text-foreground shrink-0 self-start"
      style={{ marginTop: 0 }}
    >
      {lines}
    </svg>
  )
}

// ── Bracket Column ────────────────────────────────────────────────────────────

function BracketColumn({
  slots,
  roundName,
  shortName: roundShort,
  side,
  isFirst,
}: {
  slots: BracketSlot[]
  roundName: string
  shortName: string
  side: "left" | "right"
  isFirst: boolean
}) {
  if (slots.length === 0) return null

  // Gap between cards grows as round progresses (fewer slots = more spread)
  const gapMap: Record<string, number> = { R32: 8, R16: 76, QF: 208, SF: 472 }
  const gap = gapMap[slots[0]?.round ?? "R32"] ?? 8

  const getWinner = (s: BracketSlot) => {
    if (!s.match || s.match.status !== "finished") return false
    return true
  }

  const colorClass = ROUND_COLORS[roundShort] ?? "text-muted-foreground/50"

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Round label */}
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest mb-3",
        colorClass,
      )}>
        {roundShort}
      </span>

      {/* Cards */}
      <div className="flex flex-col" style={{ gap }}>
        {slots.map((slot) => (
          <MatchSlot
            key={slot.wc26MatchId}
            slot={slot}
            isWinner={getWinner(slot)}
            side={side}
          />
        ))}
      </div>
    </div>
  )
}

// ── Half Bracket ──────────────────────────────────────────────────────────────

function HalfBracket({ half, side }: { half: BracketData["left"]; side: "left" | "right" }) {
  if (half.rounds.length === 0) return null

  const orderedRounds = side === "left"
    ? half.rounds
    : [...half.rounds].reverse()

  const gapMap: Record<string, number> = { R32: 8, R16: 76, QF: 208, SF: 472 }

  return (
    <div className="flex items-start" style={{ gap: 0 }}>
      {orderedRounds.map((round, ri) => {
        const gap = gapMap[round.slots[0]?.round ?? "R32"] ?? 8
        const prevRound = side === "left" ? orderedRounds[ri - 1] : orderedRounds[ri + 1]
        const connectorSlots = prevRound?.slots ?? round.slots

        return (
          <div key={ri} className="flex items-start">
            {/* Left side: connector BEFORE column (except first) */}
            {side === "left" && ri > 0 && (
              <ConnectorLines
                slots={connectorSlots}
                side="left"
                cardH={CARD_H}
                gap={gapMap[connectorSlots[0]?.round ?? "R32"] ?? 8}
              />
            )}

            <BracketColumn
              slots={round.slots}
              roundName={round.name}
              shortName={round.shortName}
              side={side}
              isFirst={ri === 0}
            />

            {/* Right side: connector AFTER column (except last) */}
            {side === "left" && ri < orderedRounds.length - 1 && (
              <ConnectorLines
                slots={round.slots}
                side="left"
                cardH={CARD_H}
                gap={gap}
              />
            )}
            {side === "right" && ri < orderedRounds.length - 1 && (
              <ConnectorLines
                slots={round.slots}
                side="right"
                cardH={CARD_H}
                gap={gap}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Center piece ──────────────────────────────────────────────────────────────

function CenterPiece({
  finalSlot,
  thirdPlace,
}: {
  finalSlot: BracketData["final"]
  thirdPlace: BracketData["thirdPlace"]
}) {
  return (
    <div className="flex flex-col items-center shrink-0 px-3 gap-6 mt-6">
      {/* Final */}
      {finalSlot && (
        <div className="flex flex-col items-center gap-2">
          {/* Trophy icon with glow */}
          <div className="relative">
            <div className="absolute inset-0 blur-md bg-amber-500/20 rounded-full" />
            <Trophy className="relative h-6 w-6 text-amber-400" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
            Finale
          </span>
          <div className="rounded-xl border-2 border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.12)] overflow-hidden">
            <MatchSlot slot={finalSlot} isWinner={false} side="center" size="large" />
          </div>
        </div>
      )}

      {/* 3rd place */}
      {thirdPlace && (
        <div className="flex flex-col items-center gap-2">
          <Medal className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
            3ᵉ place
          </span>
          <div className="rounded-xl border border-border/20 overflow-hidden opacity-80">
            <MatchSlot slot={thirdPlace} isWinner={false} side="center" size="normal" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BracketTree({ data }: { data: BracketData }) {
  const { left, right, final: finalSlot, thirdPlace } = data

  if (left.rounds.length === 0 && right.rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-amber-500/10 rounded-full" />
          <Trophy className="relative h-12 w-12 text-muted-foreground/20" />
        </div>
        <p className="text-sm text-muted-foreground/50 text-center max-w-xs">
          Les matchs à élimination directe apparaîtront ici après la phase de groupes.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex items-start justify-center min-w-max py-4 gap-0">

        {/* LEFT HALF  ── R32 → R16 → QF → SF */}
        <HalfBracket half={left} side="left" />

        {/* SF→Final connector left */}
        <div className="flex items-start" style={{ marginTop: 22 }}>
          {left.rounds.length > 0 && (() => {
            const sfRound = left.rounds[left.rounds.length - 1]
            return (
              <ConnectorLines
                slots={sfRound.slots}
                side="left"
                cardH={CARD_H}
                gap={472}
              />
            )
          })()}
        </div>

        {/* CENTER */}
        <CenterPiece finalSlot={finalSlot} thirdPlace={thirdPlace} />

        {/* Final→SF connector right */}
        <div className="flex items-start" style={{ marginTop: 22 }}>
          {right.rounds.length > 0 && (() => {
            const sfRound = [...right.rounds].reverse()[0]
            return (
              <ConnectorLines
                slots={sfRound.slots}
                side="right"
                cardH={CARD_H}
                gap={472}
              />
            )
          })()}
        </div>

        {/* RIGHT HALF ── SF → QF → R16 → R32 */}
        <HalfBracket half={right} side="right" />

      </div>
    </div>
  )
}
