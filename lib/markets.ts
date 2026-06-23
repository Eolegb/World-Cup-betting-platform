// =============================================================================
// Markets & odds engine for Prono CDM 2026
// -----------------------------------------------------------------------------
// the-odds-api provides odds for standard markets (h2h, totals, btts...).
// It does NOT provide "scorer + minute range" odds, so we DERIVE those from the
// anytime-scorer odds using a multiplier based on how narrow the chosen minute
// window is. This mathematically guarantees:
//     odds(scorer + minute range) > odds(scorer alone)
// because the multiplier is always > 1 for any window narrower than the full
// match.
// =============================================================================

export const MATCH_MINUTES = 90

export type MarketType =
  | "match_result" // 1X2
  | "double_chance"
  | "totals" // over/under total goals
  | "btts" // both teams to score
  | "correct_score"
  | "anytime_scorer"
  | "first_scorer"
  | "scorer_minute_range" // scorer within a minute window (derived odds)

export const MARKET_LABELS: Record<MarketType, string> = {
  match_result: "Resultat du match",
  double_chance: "Double chance",
  totals: "Total de buts",
  btts: "Les deux equipes marquent",
  correct_score: "Score exact",
  anytime_scorer: "Buteur",
  first_scorer: "Premier buteur",
  scorer_minute_range: "Buteur + tranche de minutes",
}

export type Outcome = {
  key: string
  label: string
  odds: number
  // arbitrary payload used at resolution time
  payload: Record<string, unknown>
}

export type Market = {
  type: MarketType
  label: string
  outcomes: Outcome[]
}

// ---------------------------------------------------------------------------
// Odds helpers
// ---------------------------------------------------------------------------

export function impliedProbability(odds: number): number {
  return 1 / odds
}

export function clampOdds(odds: number): number {
  return Math.max(1.01, Math.round(odds * 100) / 100)
}

const CORRECT_SCORE_ODDS: Record<string, number> = {
  "0-0": 9.5,  "0-1": 7.5,  "0-2": 11,  "0-3": 21,  "0-4": 45,  "0-5": 100,
  "1-0": 6.5,  "1-1": 6,    "1-2": 9,   "1-3": 17,  "1-4": 35,  "1-5": 75,
  "2-0": 9,    "2-1": 8,    "2-2": 12,  "2-3": 18,  "2-4": 35,  "2-5": 70,
  "3-0": 17,   "3-1": 14,   "3-2": 15,  "3-3": 30,  "3-4": 50,  "3-5": 80,
  "4-0": 35,   "4-1": 25,   "4-2": 25,  "4-3": 40,  "4-4": 55,  "4-5": 90,
  "5-0": 70,   "5-1": 55,   "5-2": 50,  "5-3": 55,  "5-4": 70,  "5-5": 100,
}

export function correctScoreOdds(home: number, away: number): number {
  const key = `${home}-${away}`
  if (CORRECT_SCORE_ODDS[key]) return CORRECT_SCORE_ODDS[key]
  if (home > 5 || away > 5) return clampOdds(Math.max(home, away) * 25)
  return CORRECT_SCORE_ODDS[key] ?? 100
}

/**
 * Multiplier applied to anytime-scorer odds to obtain scorer+minute-range odds.
 *
 * Idea: probability that the goal lands inside [from, to] is proportional to the
 * window width relative to the match. A narrower window => lower probability =>
 * higher odds. We add a small "precision premium" so even a wide window pays
 * strictly more than the plain scorer market.
 *
 * Returns a value strictly greater than 1.
 */
export function minuteRangeMultiplier(from: number, to: number): number {
  const width = Math.max(1, Math.min(MATCH_MINUTES, to) - Math.max(0, from))
  const coverage = width / MATCH_MINUTES // 0..1
  // Base inverse-coverage: full match -> ~1.18, tiny window -> large.
  // 0.85 keeps a margin so a near-full window still pays > scorer alone.
  const raw = 1 / (0.85 * coverage + 0.05)
  return Math.max(1.15, raw)
}

/**
 * Compute scorer + minute-range odds from the plain scorer odds.
 * Guarantees the result is strictly greater than `scorerOdds`.
 */
export function scorerMinuteRangeOdds(scorerOdds: number, from: number, to: number): number {
  const derived = scorerOdds * minuteRangeMultiplier(from, to)
  // Hard guarantee in case of rounding edge cases.
  return clampOdds(Math.max(derived, scorerOdds + 0.1))
}

export function potentialPayout(stake: number, odds: number): number {
  return Math.round(stake * odds)
}

export function netProfit(stake: number, odds: number): number {
  return Math.round(stake * (odds - 1))
}
