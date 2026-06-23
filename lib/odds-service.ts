// =============================================================================
// Odds Service — fetch, normalize, cache, and serve betting odds.
// -----------------------------------------------------------------------------
// Sources:
//   1. odds-api.io (preferred) — ML + goalscorer markets
//   2. the-odds-api.com (fallback) — h2h + totals
// Cache: PostgreSQL (match.oddsJson) with in-memory TTL
// =============================================================================

import { db } from "@/lib/db"
import { match } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { teamsMatch } from "@/lib/team-name"

const ODDS_API_BASE = "https://api.the-odds-api.com/v4"
const ODDS_API_IO_BASE = "https://api.odds-api.io/v3"

export type NormalizedOdds = {
  homeWin: number
  draw: number
  awayWin: number
  over25: number
  under25: number
  bttsYes: number
  bttsNo: number
  scorers?: Record<string, number> // player name → anytime scorer decimal odds
  updatedAt: string // ISO timestamp
  source?: string // "odds-api-io" | "the-odds-api" | "fallback"
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

// In-memory cache to avoid DB hits on repeated requests (TTL: 60s)
const memCache = new Map<string, { data: NormalizedOdds; expires: number }>()

// ---------------------------------------------------------------------------
// odds-api.io integration (preferred source)
// ---------------------------------------------------------------------------

type OddsApiIoEvent = {
  id: number
  home: string
  away: string
  date: string
  status: string
  sport: { slug: string }
  league: { name: string; slug: string }
  bookmakers: Record<string, {
    name: string
    updatedAt: string
    odds: Record<string, string>[]
  }[]>
}

/** Cached WC league slug to avoid re-fetching */
let wcLeagueSlug: string | null = null

async function findWcLeagueSlug(apiKey: string): Promise<string | null> {
  if (wcLeagueSlug) return wcLeagueSlug
  try {
    const res = await fetch(`${ODDS_API_IO_BASE}/leagues?sport=football&apiKey=${apiKey}`, { cache: "no-store" })
    if (!res.ok) return null
    const leagues: { name: string; slug: string }[] = await res.json()
    const wc = leagues.find(l =>
      l.name.toLowerCase().includes("world cup") ||
      l.slug.includes("world-cup") ||
      l.name.toLowerCase().includes("fifa") ||
      l.slug.includes("fifa")
    )
    if (wc) {
      wcLeagueSlug = wc.slug
      console.log(`[odds-api.io] Found WC league: ${wc.name} (${wc.slug})`)
    }
    return wcLeagueSlug
  } catch (e) {
    console.error("[odds-api.io] Failed to fetch leagues:", e)
    return null
  }
}

async function fetchOddsApiIo(): Promise<Map<string, NormalizedOdds>> {
  const apiKey = process.env.ODDS_API_IO_KEY
  if (!apiKey) return new Map()

  const slug = await findWcLeagueSlug(apiKey)
  if (!slug) {
    console.warn("[odds-api.io] Could not find World Cup league")
    return new Map()
  }

  // Fetch upcoming events
  let events: OddsApiIoEvent[] = []
  try {
    const url = `${ODDS_API_IO_BASE}/events?sport=football&league=${slug}&status=pending&apiKey=${apiKey}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      console.error(`[odds-api.io] Events error: ${res.status}`)
      return new Map()
    }
    events = await res.json()
    console.log(`[odds-api.io] Found ${events.length} upcoming WC events`)
  } catch (e) {
    console.error("[odds-api.io] Events fetch error:", e)
    return new Map()
  }

  if (!events.length) return new Map()

  // Batch odds requests (10 events per request)
  const result = new Map<string, NormalizedOdds>()
  const batches: number[][] = []
  for (let i = 0; i < events.length; i += 10) {
    batches.push(events.slice(i, i + 10).map(e => e.id))
  }

  for (const batch of batches) {
    try {
      const ids = batch.join(",")
      const url = `${ODDS_API_IO_BASE}/odds/multi?eventIds=${ids}&bookmakers=Bet365&apiKey=${apiKey}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        console.error(`[odds-api.io] Odds batch error: ${res.status}`)
        continue
      }
      const oddsData: OddsApiIoEvent[] = await res.json()

      for (const ev of oddsData) {
        const normalized = parseOddsApiIoEvent(ev)
        if (normalized) {
          // Key by "home_away" for matching
          result.set(`${ev.home}|||${ev.away}`, normalized)
        }
      }
    } catch (e) {
      console.error("[odds-api.io] Odds batch fetch error:", e)
    }
  }

  console.log(`[odds-api.io] Parsed odds for ${result.size} events`)
  return result
}

function parseOddsApiIoEvent(ev: OddsApiIoEvent): NormalizedOdds | null {
  // Find the first bookmaker with ML market
  const bookmakers = ev.bookmakers ?? {}
  let homeWin = 0, draw = 0, awayWin = 0
  let over25 = 1.9, under25 = 1.9
  let bttsYes = 1.85, bttsNo = 1.95
  const scorers: Record<string, number> = {}
  let foundML = false

  for (const [, markets] of Object.entries(bookmakers)) {
    if (!Array.isArray(markets)) continue
    for (const market of markets) {
      const name = market.name?.toUpperCase?.() ?? ""

      if (name === "ML" || name === "1X2" || name === "MATCH WINNER") {
        const odds = market.odds?.[0]
        if (odds) {
          homeWin = parseFloat(odds.home || odds["1"] || "0")
          draw = parseFloat(odds.draw || odds.X || odds.x || "0")
          awayWin = parseFloat(odds.away || odds["2"] || "0")
          if (homeWin > 1 && draw > 1 && awayWin > 1) foundML = true
        }
      }

      if (name === "TOTALS" || name === "OVER/UNDER") {
        const odds = market.odds?.[0]
        if (odds) {
          const hdp = parseFloat(odds.hdp ?? "2.5")
          if (hdp === 2.5 || !odds.hdp) {
            over25 = parseFloat(odds.over || "1.9")
            under25 = parseFloat(odds.under || "1.9")
          }
        }
      }

      if (name === "BTTS" || name === "BOTH TEAMS TO SCORE") {
        const odds = market.odds?.[0]
        if (odds) {
          bttsYes = parseFloat(odds.yes || "1.85")
          bttsNo = parseFloat(odds.no || "1.95")
        }
      }

      // Goalscorer markets
      if (name.includes("GOALSCORER") || name.includes("SCORER") || name.includes("ANYTIME")) {
        for (const outcome of market.odds ?? []) {
          // Each outcome might be { "Player Name": "3.50" } or similar
          for (const [key, val] of Object.entries(outcome)) {
            const numVal = parseFloat(String(val))
            if (key !== "updatedAt" && numVal > 1 && numVal < 100) {
              scorers[key] = numVal
            }
          }
        }
      }

      if (foundML) break // got what we need from this bookmaker
    }
    if (foundML) break
  }

  if (!foundML) return null

  return {
    homeWin: clampFourDec(homeWin),
    draw: clampFourDec(draw),
    awayWin: clampFourDec(awayWin),
    over25: clampFourDec(over25),
    under25: clampFourDec(under25),
    bttsYes: clampFourDec(bttsYes),
    bttsNo: clampFourDec(bttsNo),
    scorers: Object.keys(scorers).length > 0 ? scorers : undefined,
    updatedAt: new Date().toISOString(),
    source: "odds-api-io",
  }
}

// ---------------------------------------------------------------------------
// the-odds-api.com integration (fallback)
// ---------------------------------------------------------------------------

/** Fetch raw odds from the-odds-api. Returns empty on failure. */
async function fetchRawOdds(): Promise<OddsApiEvent[]> {
  const key = process.env.ODDS_API_KEY
  if (!key) return []

  try {
    const url = `${ODDS_API_BASE}/sports/soccer_fifa_world_cup/odds?regions=eu&markets=h2h,totals&oddsFormat=decimal&apiKey=${key}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      console.error(`[odds-service] API error: ${res.status}`)
      return []
    }
    const data: OddsApiEvent[] = await res.json()
    console.log(`[odds-service] Fetched ${data.length} events from the-odds-api`)
    return data
  } catch (e) {
    console.error("[odds-service] Fetch error:", e)
    return []
  }
}

/** Normalize raw API data into our format */
function normalizeOdds(event: OddsApiEvent): NormalizedOdds | null {
  const h2h = event.bookmakers[0]?.markets.find(m => m.key === "h2h")
  const totals = event.bookmakers[0]?.markets.find(m => m.key === "totals")
  if (!h2h) return null

  const homeWin = h2h.outcomes.find(o => o.name === event.home_team)?.price
  const awayWin = h2h.outcomes.find(o => o.name === event.away_team)?.price
  const draw = h2h.outcomes.find(o => o.name === "Draw")?.price
  const over25 = totals?.outcomes.find(o => o.name === "Over")?.price ?? 1.9
  const under25 = totals?.outcomes.find(o => o.name === "Under")?.price ?? 1.9

  if (!homeWin || !draw || !awayWin) return null

  return {
    homeWin: clampFourDec(homeWin),
    draw: clampFourDec(draw),
    awayWin: clampFourDec(awayWin),
    over25: clampFourDec(over25),
    under25: clampFourDec(under25),
    bttsYes: 1.85,
    bttsNo: 1.95,
    updatedAt: new Date().toISOString(),
    source: "the-odds-api",
  }
}

function clampFourDec(n: number): number {
  return Math.round(n * 10000) / 10000
}

const FALLBACK_ODDS: NormalizedOdds = {
  homeWin: 2.4, draw: 3.2, awayWin: 2.9,
  over25: 1.9, under25: 1.9,
  bttsYes: 1.85, bttsNo: 1.95,
  updatedAt: new Date().toISOString(),
  source: "fallback",
}

// ---------------------------------------------------------------------------
// Storage — write odds to DB for all matches
// ---------------------------------------------------------------------------

/** Store odds for all matches in DB — fuzzy team name matching */
async function storeOddsInDb(events: OddsApiEvent[]): Promise<number> {
  let stored = 0
  const allMatches = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam })
    .from(match)

  for (const e of events) {
    const odds = normalizeOdds(e)
    if (!odds) continue

    const dbMatch = allMatches.find(
      (m) => teamsMatch(m.homeTeam, e.home_team) && teamsMatch(m.awayTeam, e.away_team),
    )
    if (!dbMatch) continue

    await db.update(match).set({ oddsJson: odds }).where(eq(match.id, dbMatch.id))
    stored++
  }
  console.log(`[odds-service] Cotes stockées pour ${stored} matchs en DB`)
  return stored
}

/** Store odds-api.io normalized odds into DB */
async function storeOddsApiIoInDb(oddsMap: Map<string, NormalizedOdds>): Promise<number> {
  if (oddsMap.size === 0) return 0

  let stored = 0
  const allMatches = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam })
    .from(match)

  for (const [key, odds] of oddsMap) {
    const [home, away] = key.split("|||")
    const dbMatch = allMatches.find(
      (m) => teamsMatch(m.homeTeam, home) && teamsMatch(m.awayTeam, away),
    )
    if (!dbMatch) {
      console.warn(`[odds-api.io] No DB match for: ${home} vs ${away}`)
      continue
    }

    await db.update(match).set({ oddsJson: odds }).where(eq(match.id, dbMatch.id))
    stored++
  }
  console.log(`[odds-api.io] Stored odds for ${stored} matches`)
  return stored
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch odds for all matches and store in DB. Prefers odds-api.io, falls back to the-odds-api. */
export async function updateAllOdds(): Promise<{ ok: boolean; stored: number; source?: string; error?: string }> {
  try {
    // 1. Try odds-api.io first
    if (process.env.ODDS_API_IO_KEY) {
      const oddsMap = await fetchOddsApiIo()
      if (oddsMap.size > 0) {
        const stored = await storeOddsApiIoInDb(oddsMap)
        memCache.clear()
        return { ok: true, stored, source: "odds-api-io" }
      }
      console.warn("[odds-service] odds-api.io returned 0 results, trying fallback...")
    }

    // 2. Fallback to the-odds-api.com
    const events = await fetchRawOdds()
    if (!events.length) return { ok: false, stored: 0, error: "No odds data from any API" }
    const stored = await storeOddsInDb(events)
    memCache.clear()
    return { ok: true, stored, source: "the-odds-api" }
  } catch (e) {
    return { ok: false, stored: 0, error: String(e) }
  }
}

/** Get cached odds for a single match (checks memory → DB → fallback) */
export async function getOddsForMatch(matchId: number): Promise<NormalizedOdds | null> {
  // 1. Memory cache
  const memKey = `odds:${matchId}`
  const mem = memCache.get(memKey)
  if (mem && mem.expires > Date.now()) return mem.data

  // 2. Database
  const [row] = await db
    .select({ oddsJson: match.oddsJson, status: match.status })
    .from(match)
    .where(eq(match.id, matchId))
    .limit(1)

  // Don't return fallback for finished/live matches
  if (!row || row.status === "finished" || row.status === "live") {
    if (row?.oddsJson) {
      const data = row.oddsJson as NormalizedOdds
      memCache.set(memKey, { data, expires: Date.now() + 60000 })
      return data
    }
    return null
  }

  if (row?.oddsJson) {
    const data = row.oddsJson as NormalizedOdds
    memCache.set(memKey, { data, expires: Date.now() + 60000 })
    return data
  }

  // 3. Fallback only for scheduled matches without stored odds
  return { ...FALLBACK_ODDS, updatedAt: new Date().toISOString() }
}

/** Get all odds as a map of matchId → NormalizedOdds */
export async function getAllOdds(): Promise<Map<number, NormalizedOdds>> {
  const rows = await db
    .select({ id: match.id, oddsJson: match.oddsJson })
    .from(match)
    .where(eq(match.status, "scheduled"))

  const map = new Map<number, NormalizedOdds>()
  for (const r of rows) {
    if (r.oddsJson) {
      map.set(r.id, r.oddsJson as NormalizedOdds)
    }
  }
  return map
}

// Re-export for the sync module
export { fetchRawOdds, storeOddsInDb }
