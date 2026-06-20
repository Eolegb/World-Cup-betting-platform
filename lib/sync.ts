import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import {
  fetchFixtures,
  fetchLiveFixtures,
  fetchFixtureEvents,
  fetchMatchDetail,
  type FootballDataMatch,
  type FootballDataEvent,
} from "@/lib/providers"
import { updateAllOdds } from "@/lib/odds-service"
import { settlePendingBetsForMatch } from "@/lib/settle-match"
import { and, eq, lt, or } from "drizzle-orm"

let syncing = false

export async function runSync(): Promise<{ ok: boolean; results?: string[]; error?: string }> {
  if (syncing) {
    return { ok: true, results: ["Sync already in progress"] }
  }

  syncing = true
  try {
    const results: string[] = []

    const fixtures = await fetchFixtures(true) // force refresh
    if (fixtures.length > 0) {
      await syncFixtures(fixtures)
      results.push(`Synced ${fixtures.length} fixtures`)
    } else {
      results.push("No fixtures from API (cached or unavailable)")
    }

    const liveFixtures = await fetchLiveFixtures()
    if (liveFixtures.length > 0) {
      await syncLiveFixtures(liveFixtures)
      results.push(`Updated ${liveFixtures.length} live fixtures`)
    }

    // Detect finished matches (kickoff + 95 min, still "scheduled")
    const cutoff = new Date(Date.now() - 95 * 60 * 1000)
    const candidates = await db.select().from(match).where(and(or(eq(match.status, "scheduled"), eq(match.status, "live")), lt(match.kickoff, cutoff)))

    let eventsCount = 0
    let settledCount = 0
    for (const m of candidates) {
      if (!m.externalId) continue
      const detail = await fetchMatchDetail(m.externalId)
      if (!detail) continue
      const isFinished = detail.status === "FINISHED" ||
        (detail.score.fullTime.home != null && detail.score.fullTime.away != null)
      if (!isFinished) continue

      const homeScore = detail.score.fullTime.home ?? 0
      const awayScore = detail.score.fullTime.away ?? 0
      await db.update(match).set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: new Date() }).where(eq(match.id, m.id))

      if (detail.goals) {
        for (const g of detail.goals) {
          await db.insert(matchEvent).values({ matchId: m.id, type: "goal", detail: g.type ?? "REGULAR", player: g.scorer?.name ?? null, team: g.team?.name ?? "", minute: g.minute, extraMinute: g.extraTime }).onConflictDoNothing()
          eventsCount++
        }
      }
      const summary = await settlePendingBetsForMatch(m.id)
      settledCount += summary.settled
    }
    if (eventsCount > 0) results.push(`Synced ${eventsCount} events`)
    if (settledCount > 0) results.push(`Settled ${settledCount} bets`)

    // Also settle any already-finished matches with pending bets
    const finishedMatches = await db.select().from(match).where(eq(match.status, "finished"))
    for (const m of finishedMatches) {
      const summary = await settlePendingBetsForMatch(m.id)
      settledCount += summary.settled
    }

    // Sync odds
    const oddsResult = await updateAllOdds()
    if (oddsResult.ok) {
      results.push(`Synced odds for ${oddsResult.stored} matches`)
    } else {
      results.push("No odds from API")
    }

    return { ok: true, results }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return { ok: false, error: msg }
  } finally {
    syncing = false
  }
}

function mapStatus(fdStatus: string): string {
  switch (fdStatus) {
    case "FINISHED":
      return "finished"
    case "LIVE":
    case "IN_PLAY":
    case "PAUSED":
      return "live"
    default:
      return "scheduled" // LIVE, IN_PLAY, PAUSED, TIMED, SCHEDULED → all "scheduled"
  }
}

function calculateElapsed(kickoff: Date): number | null {
  const now = new Date()
  const diffMs = now.getTime() - kickoff.getTime()
  if (diffMs < 0) return null
  const minutes = Math.floor(diffMs / 60000)
  return Math.min(minutes, 120) // Cap at 120
}

async function syncFixtures(fixtures: FootballDataMatch[]) {
  for (const f of fixtures) {
    const home = f.homeTeam.name
    const away = f.awayTeam.name
    if (!home || !away) continue // Skip TBD matches (knockout not yet determined)

    const extId = f.id
    const kickoffStr = f.utcDate // UTC ISO string from API
    const kickoff = new Date(kickoffStr)
    const stage = f.group ?? f.stage ?? null
    const venue = f.venue ?? null
    const status = mapStatus(f.status)
    const elapsed = status === "live" ? calculateElapsed(kickoff) : null
    const homeScore = f.score.fullTime.home ?? 0
    const awayScore = f.score.fullTime.away ?? 0

    await db
      .insert(match)
      .values({
        externalId: extId,
        homeTeam: home,
        awayTeam: away,
        homeTeamCode: f.homeTeam.tla ?? home.slice(0, 3).toUpperCase(),
        awayTeamCode: f.awayTeam.tla ?? away.slice(0, 3).toUpperCase(),
        kickoff,
        stage,
        venue,
        status,
        elapsed,
        homeScore,
        awayScore,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: match.externalId,
        set: {
          status,
          elapsed,
          homeScore,
          awayScore,
          lastSyncedAt: new Date(),
        },
      })
  }
}

async function syncLiveFixtures(fixtures: FootballDataMatch[]) {
  for (const f of fixtures) {
    const extId = f.id
    const status = mapStatus(f.status)
    const kickoff = new Date(f.utcDate)
    const elapsed = calculateElapsed(kickoff)
    const homeScore = f.score.fullTime.home ?? 0
    const awayScore = f.score.fullTime.away ?? 0

    await db
      .update(match)
      .set({
        status,
        elapsed,
        homeScore,
        awayScore,
        lastSyncedAt: new Date(),
      })
      .where(eq(match.externalId, extId))
  }
}

async function syncEvents(matchId: number, apiEvents: FootballDataEvent[]) {
  for (const e of apiEvents) {
    const type = e.type === "Goal" ? "goal" : e.type === "Card" ? "card" : "var"
    await db
      .insert(matchEvent)
      .values({
        matchId,
        type,
        detail: e.detail ?? e.type,
        player: e.scorer?.name ?? null,
        team: e.team.name,
        minute: e.minute,
        extraMinute: e.extraTime,
      })
      .onConflictDoNothing()
  }
}
