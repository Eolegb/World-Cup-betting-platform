import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, ledger } from "@/lib/db/schema"
import {
  fetchFixtures,
  fetchLiveFixtures,
  fetchFixtureEvents,
  fetchMatchDetail,
  type FootballDataMatch,
  type FootballDataEvent,
} from "@/lib/providers"
import { updateAllOdds } from "@/lib/odds-service"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { and, eq, lt, sql } from "drizzle-orm"

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
    const candidates = await db.select().from(match).where(and(eq(match.status, "scheduled"), lt(match.kickoff, cutoff)))

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
      settledCount += await settleMatch(m.id)
    }
    if (eventsCount > 0) results.push(`Synced ${eventsCount} events`)
    if (settledCount > 0) results.push(`Settled ${settledCount} bets`)

    // Also settle any already-finished matches with pending bets
    const finishedMatches = await db.select().from(match).where(eq(match.status, "finished"))
    for (const m of finishedMatches) {
      settledCount += await settleMatch(m.id)
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
          .set({ balance: sql`${profile.balance} + ${payout}`, balanceBackup: sql`${profile.balance}` })
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
