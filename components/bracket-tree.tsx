"use client"

import { cn } from "@/lib/utils"
import { flagForTeam } from "@/lib/flags"
import { kickoffTime } from "@/lib/datetime"
import type { BracketData, BracketSlot } from "@/lib/bracket"
import { Trophy, Medal, ChevronRight, ChevronLeft } from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortName(name: string): string {
  if (name.length <= 12) return name
  return name.slice(0, 10) + "…"
}

function MatchSlot({ slot, isWinner, side }: { slot: BracketSlot; isWinner: boolean; side: "left" | "right" | "center" }) {
  const m = slot.match

  if (!m) {
    return (
      <div className="rounded-lg border border-dashed border-border/30 bg-secondary/5 px-2 py-1.5 text-center min-w-[110px]">
        <span className="text-[9px] text-muted-foreground/60">?</span>
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
        "rounded-lg border bg-background px-2.5 py-1.5 min-w-[115px] transition-all",
        isWinner ? "border-gold/60 shadow-[0_0_8px_rgba(234,179,8,0.12)]" : "border-border/40",
        isLive && "border-live/50"
      )}
    >
      {/* Home */}
      <div className="flex items-center gap-1">
        <span className="text-xs leading-none shrink-0">{flagForTeam(m.homeTeam, m.homeTeamCode)}</span>
        <span className={cn("text-[11px] truncate flex-1", homeWin && "font-bold", !homeWin && hasScore && "text-muted-foreground/70")}>
          {shortName(m.homeTeam)}
        </span>
        {hasScore && (
          <span className={cn("text-[11px] font-mono tabular shrink-0", homeWin && "font-bold")}>
            {m.homeScore}
          </span>
        )}
      </div>
      {/* Away */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-xs leading-none shrink-0">{flagForTeam(m.awayTeam, m.awayTeamCode)}</span>
        <span className={cn("text-[11px] truncate flex-1", awayWin && "font-bold", !awayWin && hasScore && "text-muted-foreground/70")}>
          {shortName(m.awayTeam)}
        </span>
        {hasScore && (
          <span className={cn("text-[11px] font-mono tabular shrink-0", awayWin && "font-bold")}>
            {m.awayScore}
          </span>
        )}
      </div>
      {/* Status */}
      <div className="mt-0.5 text-right">
        {m.status === "scheduled" && <span className="text-[8px] text-muted-foreground">{kickoffTime(m.kickoff)}</span>}
        {isLive && (
          <span className="inline-flex items-center gap-1 text-[8px] text-live font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />LIVE
          </span>
        )}
        {m.status === "finished" && <span className="text-[8px] text-muted-foreground">Terminé</span>}
      </div>
    </div>
  )
}

// ── Bracket Column ───────────────────────────────────────────────────────────

function BracketColumn({
  slots,
  roundName,
  side,
}: {
  slots: BracketSlot[]
  roundName: string
  side: "left" | "right"
}) {
  if (slots.length === 0) return null

  const getWinner = (s: BracketSlot) => {
    if (!s.match || s.match.status !== "finished") return null
    return s.match.homeScore > s.match.awayScore ? s.match.homeTeam
      : s.match.awayScore > s.match.homeScore ? s.match.awayTeam
      : null
  }

  // Calculer la hauteur pour que les matchs soient espacés proportionnellement
  const pairs = Math.ceil(slots.length / 2)
  const gap = slots.length <= 4 ? "gap-2" : slots.length <= 8 ? "gap-1.5" : "gap-1"

  return (
    <div className={cn("flex flex-col justify-around", gap)}>
      {slots.map((slot) => {
        const winner = getWinner(slot)
        return (
          <div key={slot.wc26MatchId} className="flex items-center gap-0.5">
            {side === "left" && (
              <div className="hidden sm:block w-3">
                {slot.round !== "R32" && <ChevronRight className="h-3 w-3 text-border/40" />}
              </div>
            )}
            <MatchSlot slot={slot} isWinner={!!winner} side={side} />
            {side === "right" && (
              <div className="hidden sm:block w-3">
                {slot.round !== "R32" && <ChevronLeft className="h-3 w-3 text-border/40" />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Half Bracket ─────────────────────────────────────────────────────────────

function HalfBracket({ half, side }: { half: BracketData["left"]; side: "left" | "right" }) {
  const orderedRounds = side === "left"
    ? half.rounds // R32, R16, QF, SF (left to right)
    : [...half.rounds].reverse() // SF, QF, R16, R32 (center to right)

  // Hauteur proportionnelle : R32 = 8 pairs, R16 = 4, QF = 2, SF = 1
  const heights: Record<string, number> = { R32: 8, R16: 4, QF: 2, SF: 1 }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {orderedRounds.map((round, ri) => (
        <div key={ri} className="flex flex-col items-center">
          <span className="text-[8px] font-semibold uppercase text-muted-foreground/50 mb-1">
            {round.shortName}
          </span>
          <div style={{ minHeight: (round.slots.length > 0 ? heights[round.slots[0].round] ?? 4 : 4) * 52 + "px" }}>
            <BracketColumn slots={round.slots} roundName={round.name} side={side} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BracketTree({ data }: { data: BracketData }) {
  const { left, right, final: finalSlot, thirdPlace } = data

  if (left.rounds.length === 0 && right.rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Les matchs à élimination directe apparaîtront ici après la phase de groupes.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex items-start justify-center gap-1 sm:gap-3 min-w-max py-2">

        {/* ── LEFT HALF ────────────────────────────────────────────────── */}
        <HalfBracket half={left} side="left" />

        {/* ── CENTER (Final + 3rd place) ────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 shrink-0 px-1 sm:px-3">
          {finalSlot && (
            <div className="flex flex-col items-center gap-1">
              <Trophy className="h-5 w-5 text-gold" />
              <div className="rounded-lg border-2 border-gold/30 bg-gold/5 px-3 py-2 min-w-[130px]">
                <MatchSlot slot={finalSlot} isWinner={false} side="center" />
              </div>
              <span className="text-[8px] font-bold uppercase text-gold">Finale</span>
            </div>
          )}
          <div className="h-4" />
          {thirdPlace && (
            <div className="flex flex-col items-center gap-1">
              <Medal className="h-4 w-4 text-muted-foreground" />
              <div className="rounded-lg border border-border/30 bg-secondary/5 px-3 py-1.5 min-w-[130px]">
                <MatchSlot slot={thirdPlace} isWinner={false} side="center" />
              </div>
              <span className="text-[8px] font-semibold uppercase text-muted-foreground">3ᵉ place</span>
            </div>
          )}
        </div>

        {/* ── RIGHT HALF ───────────────────────────────────────────────── */}
        <HalfBracket half={right} side="right" />

      </div>
    </div>
  )
}
