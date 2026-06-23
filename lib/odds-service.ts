// =============================================================================
// Odds Service — fetch, normalize, cache, and serve betting odds.
// -----------------------------------------------------------------------------
// Source: the-odds-api.com (v4) — free tier, h2h + totals markets
// Cache: PostgreSQL (match.oddsJson) with timestamp + fallback
// Cron: Vercel CRON_SECRET protects update endpoints
// =============================================================================

import { db } from "@/lib/db"
import { match } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { teamsMatch } from "@/lib/team-name"

const ODDS_API_BASE = "https://api.the-odds-api.com/v4"

export type NormalizedOdds = {
  homeWin: number
  draw: number
  awayWin: number
  over25: number
  under25: number
  bttsYes: number
  bttsNo: number
  updatedAt: string // ISO timestamp
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
    bttsYes: 1.85, // Not available; use stable fallback
    bttsNo: 1.95,
    updatedAt: new Date().toISOString(),
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
}

/** Store odds for all matches in DB — fuzzy team name matching */
async function storeOddsInDb(events: OddsApiEvent[]): Promise<number> {
  let stored = 0
  // Charger tous les matchs une seule fois pour éviter N requêtes
  const allMatches = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam })
    .from(match)

  for (const e of events) {
    const odds = normalizeOdds(e)
    if (!odds) continue

    // Correspondance floue : gère les variantes de noms (ex: "USA" ↔ "United States")
    const dbMatch = allMatches.find(
      (m) => teamsMatch(m.homeTeam, e.home_team) && teamsMatch(m.awayTeam, e.away_team),
    )
    if (!dbMatch) {
      console.warn(`[odds-service] Pas de match en DB pour: ${e.home_team} vs ${e.away_team}`)
      continue
    }

    await db.update(match).set({ oddsJson: odds }).where(eq(match.id, dbMatch.id))
    stored++
  }
  console.log(`[odds-service] Cotes stockées pour ${stored} matchs en DB`)
  return stored
}

/** Fetch odds for all matches and store in DB. Called by cron + admin sync. */
export async function updateAllOdds(): Promise<{ ok: boolean; stored: number; error?: string }> {
  try {
    const events = await fetchRawOdds()
    if (!events.length) return { ok: false, stored: 0, error: "No odds data from API" }
    const stored = await storeOddsInDb(events)
    memCache.clear()
    return { ok: true, stored }
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
