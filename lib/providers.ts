// =============================================================================
// External data providers with shared server-side caching.
// -----------------------------------------------------------------------------
// Uses football-data.org (free tier: 10 req/min) for match data and
// The Odds API (free tier) for betting odds.
// All calls go through this module which caches results in-memory with TTLs.
// The /api/sync route is the only thing that triggers polling.
// =============================================================================

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
const ODDS_API_BASE = "https://api.the-odds-api.com/v4"

export const WORLD_CUP_SEASON = 2026

type CacheEntry<T> = { value: T; expires: number }
const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  return null
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expires: Date.now() + ttlMs })
}

// --- football-data.org types --------------------------------------------

export type FootballDataMatch = {
  id: number
  utcDate: string
  status: string // SCHEDULED | TIMED | LIVE | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED
  matchday: number | null
  stage: string
  group: string | null
  venue: string | null
  homeTeam: { id: number; name: string; shortName: string; tla: string }
  awayTeam: { id: number; name: string; shortName: string; tla: string }
  score: {
    winner: string | null
    duration: string
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
  goals?: {
    minute: number
    extraTime: number | null
    type: string
    team: { id: number; name: string }
    scorer: { id: number; name: string } | null
    assist: { id: number; name: string } | null
  }[]
  bookings?: {
    minute: number
    team: { id: number; name: string }
    player: { id: number; name: string }
    card: string
  }[]
}

// Legacy alias for backward compatibility
export type ApiFootballFixture = FootballDataMatch

export type FootballDataEvent = {
  minute: number
  extraTime: number | null
  type: string
  team: { id: number; name: string }
  scorer: { id: number; name: string } | null
  detail?: string
}

// Legacy alias
export type ApiFootballEvent = FootballDataEvent

// --- Auth helpers -------------------------------------------------------

function footballDataHeaders() {
  return {
    "X-Auth-Token": process.env.FOOTBALL_DATA_KEY ?? "",
  }
}

export function hasFootballKey() {
  return Boolean(process.env.FOOTBALL_DATA_KEY)
}

export function hasOddsKey() {
  return Boolean(process.env.ODDS_API_KEY)
}

// --- Match data ---------------------------------------------------------

/** Fetch all World Cup matches. Cached 2h. */
export async function fetchFixtures(): Promise<FootballDataMatch[]> {
  const key = "fixtures"
  const cached = getCached<FootballDataMatch[]>(key)
  if (cached) return cached
  if (!hasFootballKey()) return []

  // Football-data.org doesn't support offset; fetch all in one request
  const url = `${FOOTBALL_DATA_BASE}/competitions/WC/matches?season=${WORLD_CUP_SEASON}&limit=200`
  const res = await fetch(url, { headers: footballDataHeaders(), cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  const data: FootballDataMatch[] = json?.matches ?? []
  setCached(key, data, 2 * 60 * 60 * 1000)
  return data
}

/** Fetch live/in-play matches from the cached fixtures. */
export async function fetchLiveFixtures(): Promise<FootballDataMatch[]> {
  const fixtures = await fetchFixtures()
  return fixtures.filter((m) => m.status === "LIVE" || m.status === "IN_PLAY" || m.status === "PAUSED")
}

/** Fetch detailed match including goals, bookings. Cached 60s. */
export async function fetchFixtureEvents(fixtureId: number): Promise<FootballDataEvent[]> {
  const key = `match:${fixtureId}`
  const cached = getCached<FootballDataEvent[]>(key)
  if (cached) return cached
  if (!hasFootballKey()) return []

  const url = `${FOOTBALL_DATA_BASE}/matches/${fixtureId}`
  const res = await fetch(url, { headers: footballDataHeaders(), cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  const match = json as FootballDataMatch | null

  const events: FootballDataEvent[] = []
  if (match?.goals) {
    for (const g of match.goals) {
      events.push({
        minute: g.minute,
        extraTime: g.extraTime,
        type: "Goal",
        team: g.team,
        scorer: g.scorer,
        detail: g.type,
      })
    }
  }
  if (match?.bookings) {
    for (const b of match.bookings) {
      events.push({
        minute: b.minute,
        extraTime: null,
        type: "Card",
        team: b.team,
        scorer: b.player,
        detail: b.card,
      })
    }
  }

  setCached(key, events, 60 * 1000)
  return events
}

// --- Odds (unchanged, still The Odds API) -------------------------------

export type OddsApiEvent = {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: {
    key: string
    markets: {
      key: string
      outcomes: { name: string; price: number; point?: number }[]
    }[]
  }[]
}

/** Fetch odds for the World Cup. Cached 12h. */
export async function fetchOdds(): Promise<OddsApiEvent[]> {
  const key = "odds"
  const cached = getCached<OddsApiEvent[]>(key)
  if (cached) return cached
  if (!hasOddsKey()) return []

  const markets = "h2h,totals,btts"
  const url = `${ODDS_API_BASE}/sports/soccer_fifa_world_cup/odds?regions=eu&markets=${markets}&oddsFormat=decimal&apiKey=${process.env.ODDS_API_KEY}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return []
  const data: OddsApiEvent[] = await res.json()
  setCached(key, data, 12 * 60 * 60 * 1000)
  return data
}
