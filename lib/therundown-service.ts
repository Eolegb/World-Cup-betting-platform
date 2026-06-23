// =============================================================================
// TheRundown Service — fetch FIFA World Cup odds from therundown.io
// -----------------------------------------------------------------------------
// API: https://therundown.io/api/v2
// Sport ID 18 = FIFA (World Cup)
// Auth: X-TheRundown-Key header
// Returns: moneyline + totals from 15+ sportsbooks
// =============================================================================

import { db } from "@/lib/db"
import { match } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { teamsMatch } from "@/lib/team-name"
import type { NormalizedOdds } from "@/lib/odds-service"

const API_BASE = "https://therundown.io/api/v2"
const SPORT_ID = 18 // FIFA World Cup

function getKey(): string | undefined {
  return process.env.THERUNDOWN_KEY
}

function americanToDecimal(american: number): number {
  if (american > 0) return Math.round((american / 100 + 1) * 100) / 100
  return Math.round((100 / Math.abs(american) + 1) * 100) / 100
}

interface TheRundownEvent {
  event_id: string
  event_date: string
  teams_normalized: { name: string; is_away: boolean; is_home: boolean }[]
  score?: { event_status: string }
  markets?: TheRundownMarket[]
}

interface TheRundownMarket {
  market_id: number
  name: string
  participants: {
    id: number
    type: string
    name: string
    lines: {
      value: string
      prices: Record<string, { price: number; is_main_line: boolean }>
    }[]
  }[]
}

function normalizeRundownEvent(e: TheRundownEvent): NormalizedOdds | null {
  const home = e.teams_normalized.find(t => t.is_home)
  const away = e.teams_normalized.find(t => t.is_away)
  if (!home || !away) return null

  let homeWin = 0
  let draw = 0
  let awayWin = 0
  let over25 = 0
  let under25 = 0
  let bttsYes = 0
  let bttsNo = 0

  for (const mkt of e.markets ?? []) {
    if (mkt.market_id === 1) {
      // moneyline
      for (const p of mkt.participants) {
        const mainLine = p.lines[0]
        if (!mainLine) continue
        const bestPrice = Object.values(mainLine.prices).find(x => x.is_main_line) ?? Object.values(mainLine.prices)[0]
        if (!bestPrice) continue
        const dec = americanToDecimal(bestPrice.price)
        if (p.type === "TYPE_TEAM") {
          if (p.name === home.name) homeWin = dec
          else if (p.name === away.name) awayWin = dec
        } else if (p.type === "TYPE_RESULT" && p.name === "Draw") {
          draw = dec
        }
      }
    }
    if (mkt.market_id === 3) {
      // totals (over/under)
      for (const p of mkt.participants) {
        const mainLine = p.lines.find(l => l.value === "2.5")
        if (!mainLine) continue
        const bestPrice = Object.values(mainLine.prices).find(x => x.is_main_line) ?? Object.values(mainLine.prices)[0]
        if (!bestPrice) continue
        const dec = americanToDecimal(bestPrice.price)
        if (p.name === "Over") over25 = dec
        else if (p.name === "Under") under25 = dec
      }
    }
  }

  if (!homeWin || !draw || !awayWin) return null

  return {
    homeWin,
    draw,
    awayWin,
    over25: over25 || 1.9,
    under25: under25 || 1.9,
    bttsYes: bttsYes || 1.85,
    bttsNo: bttsNo || 1.95,
    updatedAt: new Date().toISOString(),
    source: "therundown",
  }
}

export async function fetchRundownOdds(): Promise<Map<string, NormalizedOdds>> {
  const key = getKey()
  if (!key) return new Map()

  const oddsMap = new Map<string, NormalizedOdds>()

  // Fetch next 7 days of FIFA events
  for (let d = 0; d < 7; d++) {
    const date = new Date()
    date.setDate(date.getDate() + d)
    const dateStr = date.toISOString().split("T")[0]

    try {
      const url = `${API_BASE}/sports/${SPORT_ID}/events/${dateStr}?market_ids=1,3&main_line=true&offset=300`
      const res = await fetch(url, { headers: { "X-TheRundown-Key": key } })
      if (!res.ok) continue
      const data = await res.json()
      const events: TheRundownEvent[] = data.events ?? []

      for (const e of events) {
        const odds = normalizeRundownEvent(e)
        if (!odds) continue
        const home = e.teams_normalized.find(t => t.is_home)!
        const away = e.teams_normalized.find(t => t.is_away)!
        oddsMap.set(`${away.name}|||${home.name}`, odds)
      }
    } catch {
      // next day
    }
  }

  return oddsMap
}

export async function storeRundownOdds(oddsMap: Map<string, NormalizedOdds>): Promise<number> {
  if (oddsMap.size === 0) return 0

  let stored = 0
  const allMatches = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam })
    .from(match)

  for (const [key, odds] of oddsMap) {
    const [away, home] = key.split("|||")
    const dbMatch = allMatches.find(
      (m) => teamsMatch(m.homeTeam, home) && teamsMatch(m.awayTeam, away),
    )
    if (!dbMatch) continue

    await db.update(match).set({ oddsJson: odds }).where(eq(match.id, dbMatch.id))
    stored++
  }

  console.log(`[therundown] Stored odds for ${stored} matches`)
  return stored
}

export async function fetchAndStoreOddsForMatch(homeTeam: string, awayTeam: string, kickoff: Date): Promise<{ ok: boolean; odds?: NormalizedOdds; error?: string }> {
  const key = getKey()
  if (!key) return { ok: false, error: "THERUNDOWN_KEY not configured" }

  // Try the match date ± 1 day to account for UTC offset
  const dates: string[] = []
  for (let d = -1; d <= 1; d++) {
    const dt = new Date(kickoff)
    dt.setDate(dt.getDate() + d)
    dates.push(dt.toISOString().split("T")[0])
  }

  for (const dateStr of dates) {
    const url = `${API_BASE}/sports/${SPORT_ID}/events/${dateStr}?market_ids=1,3&main_line=true&offset=300`
    try {
      const res = await fetch(url, { headers: { "X-TheRundown-Key": key } })
      if (!res.ok) continue
      const data = await res.json()
      const events: TheRundownEvent[] = data.events ?? []

      for (const e of events) {
        const eventHome = e.teams_normalized.find(t => t.is_home)
        const eventAway = e.teams_normalized.find(t => t.is_away)
        if (!eventHome || !eventAway) continue

        if (teamsMatch(homeTeam, eventHome.name) && teamsMatch(awayTeam, eventAway.name)) {
          const odds = normalizeRundownEvent(e)
          if (!odds) return { ok: false, error: "Could not normalize odds" }

          const allMatches = await db
            .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam })
            .from(match)
          const dbMatch = allMatches.find(
            (m) => teamsMatch(m.homeTeam, eventHome.name) && teamsMatch(m.awayTeam, eventAway.name),
          )
          if (dbMatch) {
            await db.update(match).set({ oddsJson: odds }).where(eq(match.id, dbMatch.id))
            console.log(`[therundown] Odds updated for ${eventHome.name} vs ${eventAway.name}`)
          }

          return { ok: true, odds }
        }
      }
    } catch {
      // try next date
    }
  }

  return { ok: false, error: "Match not found in TheRundown data for this date (±1 day)" }
}
