import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, ledger } from "@/lib/db/schema"
import {
  fetchFixtures,
  fetchLiveFixtures,
  fetchFixtureEvents,
  fetchOdds,
  type FootballDataMatch,
  type FootballDataEvent,
} from "@/lib/providers"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { and, eq, sql } from "drizzle-orm"

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

    const liveMatches = await db.select().from(match).where(eq(match.status, "live"))
    let eventsCount = 0
    for (const m of liveMatches) {
      if (m.externalId) {
        const events = await fetchFixtureEvents(m.externalId)
        if (events.length > 0) {
          await syncEvents(m.id, events)
          eventsCount += events.length
        }
      }
    }
    if (eventsCount > 0) results.push(`Synced ${eventsCount} events`)

    const odds = await fetchOdds()
    results.push(`Fetched odds for ${odds.length} matches`)

    const finishedMatches = await db.select().from(match).where(eq(match.status, "finished"))
    let settledCount = 0
    for (const m of finishedMatches) {
      const count = await settleMatch(m)
      settledCount += count
    }
    if (settledCount > 0) results.push(`Settled ${settledCount} bets`)

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
    case "LIVE":
    case "IN_PLAY":
    case "PAUSED":
      return "live"
    case "FINISHED":
      return "finished"
    default:
      return "scheduled"
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
    const kickoff = new Date(f.utcDate)
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

async function settleMatch(m: typeof match.$inferSelect): Promise<number> {
  const pendingBets = await db
    .select()
    .from(bet)
    .where(and(eq(bet.matchId, m.id), eq(bet.status, "pending")))

  if (pendingBets.length === 0) return 0

  const events = await db
    .select()
    .from(matchEvent)
    .where(and(eq(matchEvent.matchId, m.id), eq(matchEvent.type, "goal")))
    .orderBy(matchEvent.minute)

  const goals: GoalEvent[] = events.map((e) => ({
    player: e.player,
    team: e.team === m.homeTeam ? "home" : "away",
    minute: e.minute ?? 0,
  }))

  const resolvable: ResolvableMatch = {
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    goals,
  }

  let settled = 0
  for (const b of pendingBets) {
    const result = resolveBet(resolvable, {
      marketType: b.marketType,
      selection: b.selection as Record<string, unknown>,
      minuteFrom: b.minuteFrom,
      minuteTo: b.minuteTo,
    })

    const payout = result === "won" ? b.potentialPayout : 0
    const newStatus = result === "won" ? "won" : "lost"

    await db.transaction(async (tx) => {
      await tx.update(bet).set({ status: newStatus, payout, settledAt: new Date() }).where(eq(bet.id, b.id))

      if (payout > 0) {
        const [p] = await tx
          .update(profile)
          .set({ balance: sql`${profile.balance} + ${payout}` })
          .where(eq(profile.userId, b.userId))
          .returning()

        await tx.insert(ledger).values({
          userId: b.userId,
          betId: b.id,
          amount: payout,
          balanceAfter: p.balance,
          reason: `Gain: ${b.label}`,
        })
      }
    })

    settled++
  }

  return settled
}
