// =============================================================================
// External data providers with shared server-side caching.
// -----------------------------------------------------------------------------
// Sources:
//   - football-data.org (free) → fixtures list, scores (always works for 2026)
//   - api-football.com (api-sports.io) → goals, events, minute details (paid plan)
//   - the-odds-api.com → betting odds (free)
// =============================================================================

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io"
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

export function hasApiFootballKey() {
  return Boolean(process.env.API_FOOTBALL_KEY)
}

export function hasOddsKey() {
  return Boolean(process.env.ODDS_API_KEY)
}

// --- Match data ---------------------------------------------------------

/** Fetch all World Cup matches. Cached 2h. Pass force=true to bypass cache. */
export async function fetchFixtures(force = false): Promise<FootballDataMatch[]> {
  const key = "fixtures"
  if (!force) {
    const cached = getCached<FootballDataMatch[]>(key)
    if (cached) return cached
  }
  if (!hasFootballKey()) return []

  const url = `${FOOTBALL_DATA_BASE}/competitions/WC/matches?season=${WORLD_CUP_SEASON}&limit=200`
  const res = await fetch(url, { headers: footballDataHeaders(), cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  const data: FootballDataMatch[] = json?.matches ?? []
  setCached(key, data, 2 * 60 * 60 * 1000)
  return data
}

/** Fetch live/in-play matches DIRECTLY from API (no cache — must be fresh). */
export async function fetchLiveFixtures(): Promise<FootballDataMatch[]> {
  if (!hasFootballKey()) return []

  // Fetch both LIVE and IN_PLAY statuses
  const results: FootballDataMatch[] = []
  for (const status of ["LIVE", "IN_PLAY", "PAUSED"]) {
    const url = `${FOOTBALL_DATA_BASE}/competitions/WC/matches?season=${WORLD_CUP_SEASON}&status=${status}`
    const res = await fetch(url, { headers: footballDataHeaders(), cache: "no-store" })
    if (!res.ok) continue
    const json = await res.json()
    if (json?.matches) results.push(...json.matches)
  }
  return results
}

/** Fetch a single match detail (for minute + goals). Cached 30s. */
export async function fetchMatchDetail(fixtureId: number): Promise<FootballDataMatch | null> {
  const key = `match-detail:${fixtureId}`
  const cached = getCached<FootballDataMatch>(key)
  if (cached) return cached
  if (!hasFootballKey()) return null

  const url = `${FOOTBALL_DATA_BASE}/matches/${fixtureId}`
  const res = await fetch(url, { headers: footballDataHeaders(), cache: "no-store" })
  if (!res.ok) return null
  const json = await res.json()
  setCached(key, json, 30 * 1000)
  return json as FootballDataMatch
}

/** Fetch detailed match including goals, bookings. Cached 60s. */
export async function fetchFixtureEvents(fixtureId: number): Promise<FootballDataEvent[]> {
  // Try api-football first (has scorer names + exact minutes on paid plan)
  const apiEvents = await fetchApiFootballEvents(fixtureId)
  if (apiEvents.length > 0) return apiEvents

  // Fallback to football-data.org
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
      events.push({ minute: g.minute, extraTime: g.extraTime, type: "Goal", team: g.team, scorer: g.scorer, detail: g.type })
    }
  }
  if (match?.bookings) {
    for (const b of match.bookings) {
      events.push({ minute: b.minute, extraTime: null, type: "Card", team: b.team, scorer: b.player, detail: b.card })
    }
  }

  setCached(key, events, 60 * 1000)
  return events
}

// --- api-football.com (api-sports.io) -------------------------------------

type ApiFootballEventRaw = {
  time: { elapsed: number | null; extra: number | null }
  team: { id: number; name: string }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string // "Goal" | "Card" | "subst" | "Var"
  detail: string
  comments: string | null
}

async function fetchApiFootballEvents(fixtureId: number): Promise<FootballDataEvent[]> {
  const key = `apifoot:events:${fixtureId}`
  const cached = getCached<FootballDataEvent[]>(key)
  if (cached) return cached
  if (!hasApiFootballKey()) return []

  try {
    const url = `${API_FOOTBALL_BASE}/fixtures/events?fixture=${fixtureId}`
    const res = await fetch(url, { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! }, cache: "no-store" })
    if (!res.ok) return []
    const json = await res.json()
    const raw: ApiFootballEventRaw[] = json?.response ?? []

    const events: FootballDataEvent[] = raw.map(e => ({
      minute: e.time.elapsed ?? 0,
      extraTime: e.time.extra,
      type: e.type,
      team: e.team,
      scorer: e.player?.name ? { id: e.player.id ?? 0, name: e.player.name } : null,
      detail: e.detail ?? e.type,
    }))

    if (events.length > 0) {
      setCached(key, events, 60 * 1000)
      console.log(`[api-football] ${events.length} events for fixture ${fixtureId}`)
    }
    return events
  } catch {
    return []
  }
}

// Also add a function to find api-football fixture IDs by team names
export async function findApiFootballFixtureId(homeTeam: string, awayTeam: string): Promise<number | null> {
  if (!hasApiFootballKey()) return null
  const key = `apifoot:fix:${homeTeam}:${awayTeam}`
  const cached = getCached<number | null>(key)
  if (cached !== null && cached !== undefined) return cached

  try {
    // Search api-football for fixtures matching these teams
    const url = `${API_FOOTBALL_BASE}/fixtures?league=1&season=2026`
    const res = await fetch(url, { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! }, cache: "no-store" })
    if (!res.ok) { setCached(key, null, 3600000); return null }

    const json = await res.json()
    if (json?.errors?.plan) { setCached(key, null, 3600000); return null }

    const fixtures = json?.response ?? []
    for (const f of fixtures) {
      if (f.teams.home.name === homeTeam && f.teams.away.name === awayTeam) {
        setCached(key, f.fixture.id, 3600000)
        return f.fixture.id
      }
    }
    setCached(key, null, 3600000)
    return null
  } catch {
    return null
  }
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

/** Fetch odds for the World Cup. Cached 2h. Also updates the shared odds lookup. */
export async function fetchOdds(): Promise<OddsApiEvent[]> {
  const key = "odds"
  const cached = getCached<OddsApiEvent[]>(key)
  if (cached) {
    updateOddsLookup(cached)
    return cached
  }
  if (!hasOddsKey()) return []

  const markets = "h2h,totals"
  const url = `${ODDS_API_BASE}/sports/soccer_fifa_world_cup/odds?regions=eu&markets=${markets}&oddsFormat=decimal&apiKey=${process.env.ODDS_API_KEY}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return []
  const data: OddsApiEvent[] = await res.json()
  setCached(key, data, 2 * 60 * 60 * 1000)
  updateOddsLookup(data)
  return data
}

// Shared odds lookup by team name, updated after each fetch.
const oddsByTeam = new Map<string, { homeWin: number; draw: number; awayWin: number; over25: number; under25: number }>()

function updateOddsLookup(events: OddsApiEvent[]) {
  oddsByTeam.clear()
  for (const e of events) {
    const h2h = e.bookmakers[0]?.markets.find(m => m.key === "h2h")
    const totals = e.bookmakers[0]?.markets.find(m => m.key === "totals")
    const homeWin = h2h?.outcomes.find(o => o.name === e.home_team)?.price
    const awayWin = h2h?.outcomes.find(o => o.name === e.away_team)?.price
    const draw = h2h?.outcomes.find(o => o.name === "Draw")?.price
    const over25 = totals?.outcomes.find(o => o.name === "Over")?.price
    const under25 = totals?.outcomes.find(o => o.name === "Under")?.price
    if (homeWin && awayWin && draw) {
      oddsByTeam.set(e.home_team, { homeWin, draw, awayWin, over25: over25 ?? 1.9, under25: under25 ?? 1.9 })
    }
    // Also store by away team for reverse lookup
    if (homeWin && awayWin && draw) {
      oddsByTeam.set(e.away_team, { homeWin: awayWin, draw, awayWin: homeWin, over25: over25 ?? 1.9, under25: under25 ?? 1.9 })
    }
  }
}

/** Get cached odds for a team (as home side). */
export function getOddsForTeam(teamName: string): { homeWin: number; draw: number; awayWin: number; over25: number; under25: number } | null {
  // Exact match
  if (oddsByTeam.has(teamName)) return oddsByTeam.get(teamName)!
  // Fuzzy match
  const lower = teamName.toLowerCase()
  for (const [key, val] of oddsByTeam) {
    if (key.toLowerCase() === lower) return val
  }
  return null
}
