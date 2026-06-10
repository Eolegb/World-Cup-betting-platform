// =============================================================================
// Bet resolution engine (pure logic).
// -----------------------------------------------------------------------------
// Given a finished match (score + goal events) and a bet, returns the outcome:
// "won" | "lost". Each goal event carries the scorer's name, their team, and
// the minute — that's what lets us settle "scorer + minute range" bets.
// =============================================================================

export type GoalEvent = {
  player: string | null
  team: string // "home" | "away"
  minute: number
}

export type ResolvableMatch = {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  goals: GoalEvent[]
}

export type ResolvableBet = {
  marketType: string
  selection: Record<string, unknown>
  minuteFrom: number | null
  minuteTo: number | null
}

function matchSide(m: ResolvableMatch): "home" | "draw" | "away" {
  if (m.homeScore > m.awayScore) return "home"
  if (m.awayScore > m.homeScore) return "away"
  return "draw"
}

function playerScored(m: ResolvableMatch, player: string): GoalEvent[] {
  return m.goals.filter((g) => g.player === player)
}

/** Returns "won" | "lost" for a settled match. */
export function resolveBet(m: ResolvableMatch, bet: ResolvableBet): "won" | "lost" {
  const sel = bet.selection

  switch (bet.marketType) {
    case "match_result": {
      return matchSide(m) === sel.side ? "won" : "lost"
    }
    case "double_chance": {
      const sides = (sel.sides as string[]) ?? []
      return sides.includes(matchSide(m)) ? "won" : "lost"
    }
    case "totals": {
      const total = m.homeScore + m.awayScore
      const line = Number(sel.line ?? 2.5)
      if (sel.side === "over") return total > line ? "won" : "lost"
      return total < line ? "won" : "lost"
    }
    case "btts": {
      const both = m.homeScore > 0 && m.awayScore > 0
      return both === Boolean(sel.yes) ? "won" : "lost"
    }
    case "correct_score": {
      return m.homeScore === Number(sel.home) && m.awayScore === Number(sel.away) ? "won" : "lost"
    }
    case "anytime_scorer": {
      return playerScored(m, String(sel.player)).length > 0 ? "won" : "lost"
    }
    case "first_scorer": {
      const first = [...m.goals].sort((a, b) => a.minute - b.minute)[0]
      return first && first.player === sel.player ? "won" : "lost"
    }
    case "scorer_minute_range": {
      const from = bet.minuteFrom ?? 0
      const to = bet.minuteTo ?? 90
      const goals = playerScored(m, String(sel.player))
      return goals.some((g) => g.minute >= from && g.minute <= to) ? "won" : "lost"
    }
    default:
      return "lost"
  }
}
