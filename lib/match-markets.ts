import {
  type Market,
  type MarketType,
  type Outcome,
  clampOdds,
  scorerMinuteRangeOdds,
} from "./markets"
import { getPlayerBaseOdds, rosterFor } from "./teams"
import { flagForTeam } from "./flags"

// A lightweight shape of a match used by the market builder (matches the db row).
export type MatchLike = {
  id: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
}

// Odds inputs sourced from the-odds-api (or fallbacks).
export type OddsInputs = {
  homeWin?: number
  draw?: number
  awayWin?: number
  over25?: number
  under25?: number
  bttsYes?: number
  bttsNo?: number
  // map of player name -> anytime scorer odds
  scorers?: Record<string, number>
}

// Default/fallback odds when the provider returns nothing for a market.
const FALLBACK: Required<Omit<OddsInputs, "scorers">> = {
  homeWin: 2.4,
  draw: 3.2,
  awayWin: 2.9,
  over25: 1.9,
  under25: 1.9,
  bttsYes: 1.85,
  bttsNo: 1.95,
}

/**
 * Build the full set of markets for a match. `players` is a roster used for
 * scorer markets; `scorers` odds come from the provider when available,
 * otherwise a heuristic baseline is used.
 */
export function buildMarkets(match: MatchLike, players: string[], odds: OddsInputs = {}, starters?: Set<string>): Market[] {
  const o = { ...FALLBACK, ...odds }
  const markets: Market[] = []

  // 1X2
  const homeFlag = flagForTeam(match.homeTeam)
  const awayFlag = flagForTeam(match.awayTeam)
  markets.push({
    type: "match_result",
    label: "Resultat du match",
    outcomes: [
      { key: "home", label: `${homeFlag} ${match.homeTeam}`, odds: clampOdds(o.homeWin), payload: { side: "home" } },
      { key: "draw", label: "🤝 Nul", odds: clampOdds(o.draw), payload: { side: "draw" } },
      { key: "away", label: `${awayFlag} ${match.awayTeam}`, odds: clampOdds(o.awayWin), payload: { side: "away" } },
    ],
  })

  // Double chance (derived from 1X2 implied probabilities).
  const pHome = 1 / o.homeWin
  const pDraw = 1 / o.draw
  const pAway = 1 / o.awayWin
  const dc = (a: number, b: number) => clampOdds(1 / Math.min(0.97, a + b))
  markets.push({
    type: "double_chance",
    label: "Double chance",
    outcomes: [
      { key: "1X", label: `${homeFlag} ${match.homeTeam} ou Nul`, odds: dc(pHome, pDraw), payload: { sides: ["home", "draw"] } },
      { key: "12", label: "🤝 Pas de nul", odds: dc(pHome, pAway), payload: { sides: ["home", "away"] } },
      { key: "X2", label: `Nul ou ${awayFlag} ${match.awayTeam}`, odds: dc(pDraw, pAway), payload: { sides: ["draw", "away"] } },
    ],
  })

  // Totals (over/under 2.5).
  markets.push({
    type: "totals",
    label: "Total de buts (2.5)",
    outcomes: [
      { key: "over", label: "Plus de 2.5 buts", odds: clampOdds(o.over25), payload: { line: 2.5, side: "over" } },
      { key: "under", label: "Moins de 2.5 buts", odds: clampOdds(o.under25), payload: { line: 2.5, side: "under" } },
    ],
  })

  // BTTS.
  markets.push({
    type: "btts",
    label: "Les deux equipes marquent",
    outcomes: [
      { key: "yes", label: "Oui", odds: clampOdds(o.bttsYes), payload: { yes: true } },
      { key: "no", label: "Non", odds: clampOdds(o.bttsNo), payload: { yes: false } },
    ],
  })

  // Correct score — handled in UI with pick-your-own-score.
  markets.push({
    type: "correct_score",
    label: "Score exact",
    outcomes: [],
  })

  // Anytime scorer + first scorer, tagged by team. Lineup multipliers applied.
  const scorerOdds = odds.scorers ?? {}
  const anytime: Outcome[] = []
  const first: Outcome[] = []
  const homeRoster = new Set(rosterFor(match.homeTeam).map(p => p.toLowerCase()))
  const startersNorm = starters ? new Set(Array.from(starters).map(s => s.toLowerCase().trim())) : null
  for (const p of players) {
    const base = scorerOdds[p] ?? getPlayerBaseOdds(p, players.indexOf(p))
    const team = homeRoster.has(p.toLowerCase()) ? "home" : "away"

    // Apply lineup multiplier
    let multiplier = 1.0
    if (startersNorm) {
      if (startersNorm.has(p.toLowerCase().trim())) {
        multiplier = 0.85 // starter → more likely to score
      } else {
        multiplier = 1.25 // bench/reserve → less likely
      }
    }

    anytime.push({ key: p, label: p, odds: clampOdds(base * multiplier), payload: { player: p, team } })
    first.push({ key: p, label: p, odds: clampOdds(base * 2.6 * multiplier), payload: { player: p, team } })
  }
  if (anytime.length) {
    markets.push({ type: "anytime_scorer", label: "Buteur", outcomes: anytime })
    markets.push({ type: "first_scorer", label: "Premier buteur", outcomes: first })
  }

  return markets
}


/** Anytime-scorer odds for a given player, for the minute-range market. */
export function anytimeOddsForPlayer(markets: Market[], player: string): number | null {
  const m = markets.find((x) => x.type === "anytime_scorer")
  const o = m?.outcomes.find((x) => x.key === player)
  return o ? o.odds : null
}

export { scorerMinuteRangeOdds }
export type { MarketType }
