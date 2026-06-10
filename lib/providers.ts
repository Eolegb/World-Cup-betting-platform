// =============================================================================
// External data providers with shared server-side caching.
// -----------------------------------------------------------------------------
// IMPORTANT: api-football allows only ~100 requests/day on the free plan, so we
// NEVER call it per-user. All calls go through this module which caches results
// in-memory (per server instance) with TTLs. The /api/sync route is the only
// thing that triggers live polling, and it is rate-limited there.
// =============================================================================

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io"
const ODDS_API_BASE = "https://api.the-odds-api.com/v4"

// World Cup league id in api-football is 1; season 2026.
export const WORLD_CUP_LEAGUE_ID = 1
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

export type ApiFootballFixture = {
  fixture: {
    id: number
    date: string
    venue?: { name?: string | null }
    status: { short: string; elapsed: number | null }
  }
  league: { round?: string }
  teams: {
    home: { name: string; winner: boolean | null }
    away: { name: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
}

export type ApiFootballEvent = {
  time: { elapsed: number | null; extra: number | null }
  team: { name: string }
  player: { name: string | null }
  type: string // "Goal" | "Card" | "subst" | "Var"
  detail: string
}

function footballHeaders() {
  return {
    "x-apisports-key": process.env.API_FOOTBALL_KEY ?? "",
  }
}

export function hasFootballKey() {
  return Boolean(process.env.API_FOOTBALL_KEY)
}

export function hasOddsKey() {
  return Boolean(process.env.ODDS_API_KEY)
}

/** Fetch fixtures for the World Cup. Cached 6h (fixtures rarely change). */
export async function fetchFixtures(): Promise<ApiFootballFixture[]> {
  const key = "fixtures"
  const cached = getCached<ApiFootballFixture[]>(key)
  if (cached) return cached
  if (!hasFootballKey()) return []

  const url = `${API_FOOTBALL_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}`
  const res = await fetch(url, { headers: footballHeaders(), cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  const data: ApiFootballFixture[] = json?.response ?? []
  setCached(key, data, 6 * 60 * 60 * 1000)
  return data
}

/** Fetch live fixtures only. Cached 60s. */
export async function fetchLiveFixtures(): Promise<ApiFootballFixture[]> {
  const key = "fixtures:live"
  const cached = getCached<ApiFootballFixture[]>(key)
  if (cached) return cached
  if (!hasFootballKey()) return []

  const url = `${API_FOOTBALL_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}&live=all`
  const res = await fetch(url, { headers: footballHeaders(), cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  const data: ApiFootballFixture[] = json?.response ?? []
  setCached(key, data, 60 * 1000)
  return data
}

/** Fetch events (goals, cards) for a fixture. Cached 60s. */
export async function fetchFixtureEvents(fixtureId: number): Promise<ApiFootballEvent[]> {
  const key = `events:${fixtureId}`
  const cached = getCached<ApiFootballEvent[]>(key)
  if (cached) return cached
  if (!hasFootballKey()) return []

  const url = `${API_FOOTBALL_BASE}/fixtures/events?fixture=${fixtureId}`
  const res = await fetch(url, { headers: footballHeaders(), cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  const data: ApiFootballEvent[] = json?.response ?? []
  setCached(key, data, 60 * 1000)
  return data
}

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

/** Fetch odds for the World Cup. Cached 12h to preserve the daily quota. */
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
