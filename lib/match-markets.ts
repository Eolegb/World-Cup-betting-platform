import {
  type Market,
  type MarketType,
  type Outcome,
  clampOdds,
  scorerMinuteRangeOdds,
} from "./markets"

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
export function buildMarkets(match: MatchLike, players: string[], odds: OddsInputs = {}): Market[] {
  const o = { ...FALLBACK, ...odds }
  const markets: Market[] = []

  // 1X2
  markets.push({
    type: "match_result",
    label: "Resultat du match",
    outcomes: [
      { key: "home", label: `${match.homeTeam} gagne`, odds: clampOdds(o.homeWin), payload: { side: "home" } },
      { key: "draw", label: "Match nul", odds: clampOdds(o.draw), payload: { side: "draw" } },
      { key: "away", label: `${match.awayTeam} gagne`, odds: clampOdds(o.awayWin), payload: { side: "away" } },
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
      { key: "1X", label: `${match.homeTeam} ou Nul`, odds: dc(pHome, pDraw), payload: { sides: ["home", "draw"] } },
      { key: "12", label: "Pas de nul", odds: dc(pHome, pAway), payload: { sides: ["home", "away"] } },
      { key: "X2", label: `Nul ou ${match.awayTeam}`, odds: dc(pDraw, pAway), payload: { sides: ["draw", "away"] } },
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

  // Correct score (a curated grid).
  const scores: [number, number, number][] = [
    [1, 0, 6.5],
    [2, 0, 9],
    [2, 1, 8],
    [0, 0, 9.5],
    [1, 1, 6],
    [2, 2, 12],
    [0, 1, 7.5],
    [0, 2, 11],
    [1, 2, 9],
  ]
  markets.push({
    type: "correct_score",
    label: "Score exact",
    outcomes: scores.map(([h, a, odd]) => ({
      key: `${h}-${a}`,
      label: `${match.homeTeam} ${h} - ${a} ${match.awayTeam}`,
      odds: clampOdds(odd),
      payload: { home: h, away: a },
    })),
  })

  // Anytime scorer + first scorer, from roster.
  const scorerOdds = odds.scorers ?? {}
  const anytime: Outcome[] = []
  const first: Outcome[] = []
  for (const p of players) {
    const base = scorerOdds[p] ?? heuristicScorerOdds(p, players.length)
    anytime.push({ key: p, label: p, odds: clampOdds(base), payload: { player: p } })
    // First scorer is rarer than anytime -> higher odds.
    first.push({ key: p, label: p, odds: clampOdds(base * 2.6), payload: { player: p } })
  }
  if (anytime.length) {
    markets.push({ type: "anytime_scorer", label: "Buteur", outcomes: anytime })
    markets.push({ type: "first_scorer", label: "Premier buteur", outcomes: first })
  }

  return markets
}

// Stable pseudo-random baseline odds so the roster has varied prices.
function heuristicScorerOdds(player: string, rosterSize: number): number {
  let h = 0
  for (let i = 0; i < player.length; i++) h = (h * 31 + player.charCodeAt(i)) % 1000
  const spread = 2.2 + (h / 1000) * 6 // 2.2 .. 8.2
  return spread
}

/** Anytime-scorer odds for a given player, for the minute-range market. */
export function anytimeOddsForPlayer(markets: Market[], player: string): number | null {
  const m = markets.find((x) => x.type === "anytime_scorer")
  const o = m?.outcomes.find((x) => x.key === player)
  return o ? o.odds : null
}

export { scorerMinuteRangeOdds }
export type { MarketType }
