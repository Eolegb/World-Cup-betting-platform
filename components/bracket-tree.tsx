"use client"

import { cn } from "@/lib/utils"
import { flagForTeam } from "@/lib/flags"
import { teamColors } from "@/lib/team-colors"
import { kickoffTime } from "@/lib/datetime"
import type { BracketData, BracketSlot, BracketRound } from "@/lib/bracket"
import { Trophy, Medal } from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortName(name: string): string {
  if (name.length <= 12) return name
  return name.slice(0, 10) + "…"
}

function MatchSlot({ slot, isWinner }: { slot: BracketSlot; isWinner: boolean }) {
  const m = slot.match
  const colors = m ? teamColors(m.homeTeam) : { primary: "#6b7280", secondary: "#9ca3af" }

  // Équipe non déterminée
  if (!m) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 bg-secondary/10 px-2 py-1.5 text-center min-w-[120px]">
        <span className="text-[10px] text-muted-foreground">À déterminer</span>
      </div>
    )
  }

  const homeWin = m.status === "finished" && m.homeScore > m.awayScore
  const awayWin = m.status === "finished" && m.awayScore > m.homeScore
  const isLive = m.status === "live"
  const hasStarted = m.status === "live" || m.status === "finished"

  return (
    <div
      className={cn(
        "rounded-xl border bg-background px-3 py-2 min-w-[130px] transition-all",
        isWinner ? "border-gold/60 shadow-[0_0_12px_rgba(234,179,8,0.15)]" : "border-border/50",
        isLive && "border-live/60"
      )}
    >
      {/* Home team */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{flagForTeam(m.homeTeam, m.homeTeamCode)}</span>
        <span
          className={cn(
            "text-xs truncate flex-1",
            homeWin && "font-bold text-foreground",
            !homeWin && hasStarted && "text-muted-foreground"
          )}
        >
          {shortName(m.homeTeam)}
        </span>
        {hasStarted && (
          <span className={cn("text-xs font-mono tabular", homeWin ? "text-foreground font-bold" : "text-muted-foreground")}>
            {m.homeScore}
          </span>
        )}
      </div>
      {/* Away team */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-sm leading-none">{flagForTeam(m.awayTeam, m.awayTeamCode)}</span>
        <span
          className={cn(
            "text-xs truncate flex-1",
            awayWin && "font-bold text-foreground",
            !awayWin && hasStarted && "text-muted-foreground"
          )}
        >
          {shortName(m.awayTeam)}
        </span>
        {hasStarted && (
          <span className={cn("text-xs font-mono tabular", awayWin ? "text-foreground font-bold" : "text-muted-foreground")}>
            {m.awayScore}
          </span>
        )}
      </div>
      {/* Status line */}
      {m.status === "scheduled" && (
        <div className="mt-1 text-[9px] text-muted-foreground text-right">{kickoffTime(m.kickoff)}</div>
      )}
      {isLive && (
        <div className="mt-1 flex items-center justify-end gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
          <span className="text-[9px] text-live font-medium">LIVE</span>
        </div>
      )}
      {m.status === "finished" && (
        <div className="mt-1 text-[9px] text-muted-foreground text-right">Terminé</div>
      )}
    </div>
  )
}

// ── Round Column ─────────────────────────────────────────────────────────────

function RoundColumn({
  round,
  slots,
  allSlots,
}: {
  round: BracketRound["name"]
  shortName: string
  slots: BracketSlot[]
  allSlots: Map<number, BracketSlot>
}) {
  const getWinner = (slot: BracketSlot): string | null => {
    if (!slot.match || slot.match.status !== "finished") return null
    if (slot.match.homeScore > slot.match.awayScore) return slot.match.homeTeam
    if (slot.match.awayScore > slot.match.homeScore) return slot.match.awayTeam
    return null
  }

  return (
    <div className="flex flex-col justify-around gap-1" style={{ minHeight: slots.length * 52 + "px" }}>
      {slots.map((slot) => {
        const winner = getWinner(slot)
        return (
          <div key={slot.wc26MatchId} className="flex items-center gap-2">
            {/* Connector bracket */}
            <div className="hidden lg:flex items-center">
              {/* Right-side connector for rounds other than R32 */}
              <ConnectorBracket
                slot={slot}
                allSlots={allSlots}
                showLeft={slot.round !== "R32"}
                showRight={slot.round !== "FINAL" && slot.round !== "3RD"}
              />
            </div>
            <MatchSlot slot={slot} isWinner={!!winner} />
          </div>
        )
      })}
    </div>
  )
}

// ── Connector Lines ──────────────────────────────────────────────────────────

function ConnectorBracket({
  slot,
  allSlots,
  showLeft,
  showRight,
}: {
  slot: BracketSlot
  allSlots: Map<number, BracketSlot>
  showLeft: boolean
  showRight: boolean
}) {
  return (
    <div className="flex items-center shrink-0" style={{ width: "40px", height: "1px" }}>
      {/* Simple horizontal line connector */}
      <div className="w-full h-px bg-border/60 relative">
        {showLeft && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-1 rounded-r-sm bg-border/60" />}
        {showRight && <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-1 rounded-l-sm bg-border/60" />}
      </div>
    </div>
  )
}

// ── Title ────────────────────────────────────────────────────────────────────

function BracketTitle({ rounds }: { rounds: { shortName: string }[] }) {
  return (
    <div className="hidden lg:flex items-center gap-16 mb-3 pl-2">
      {rounds.map((r, i) => (
        <span
          key={i}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center"
          style={{ minWidth: "130px" }}
        >
          {r.shortName}
        </span>
      ))}
      <span className="text-xs font-semibold uppercase tracking-wider text-primary text-center" style={{ minWidth: "130px" }}>
        FINALE
      </span>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BracketTree({ data }: { data: BracketData }) {
  const { rounds, thirdPlace, final: finalSlot } = data

  // Build a flat map of all slots by wc26MatchId
  const allSlots = new Map<number, BracketSlot>()
  for (const round of rounds) {
    for (const s of round.slots) allSlots.set(s.wc26MatchId, s)
  }
  if (thirdPlace) allSlots.set(thirdPlace.wc26MatchId, thirdPlace)
  if (finalSlot) allSlots.set(finalSlot.wc26MatchId, finalSlot)

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Trophy className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Le bracket sera disponible après la fin de la phase de groupes.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      {/* Column headers (desktop only) */}
      <BracketTitle rounds={rounds} />

      {/* Bracket grid */}
      <div className="flex items-start gap-4 lg:gap-10 min-w-max">
        {rounds.map((round, ri) => (
          <div key={ri} className="flex flex-col items-center gap-2">
            {/* Mobile round label */}
            <span className="lg:hidden text-[10px] font-semibold uppercase text-muted-foreground mb-1">
              {round.shortName}
            </span>
            <RoundColumn
              round={round.name}
              shortName={round.shortName}
              slots={round.slots}
              allSlots={allSlots}
            />
          </div>
        ))}

        {/* Final + Third place column */}
        <div className="flex flex-col items-center gap-6">
          <span className="lg:hidden text-[10px] font-semibold uppercase text-primary mb-1">FINALE</span>
          {finalSlot && (
            <div className="flex flex-col items-center gap-1">
              <Trophy className="h-4 w-4 text-gold" />
              <MatchSlot slot={finalSlot} isWinner={false} />
            </div>
          )}
          {thirdPlace && (
            <div className="flex flex-col items-center gap-1">
              <Medal className="h-4 w-4 text-muted-foreground" />
              <MatchSlot slot={thirdPlace} isWinner={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
