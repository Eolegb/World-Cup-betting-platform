import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, ledger } from "@/lib/db/schema"
import {
  fetchFixtures,
  fetchLiveFixtures,
  fetchFixtureEvents,
  fetchOdds,
  type ApiFootballFixture,
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

    const fixtures = await fetchFixtures()
    if (fixtures.length > 0) {
      await syncFixtures(fixtures)
      results.push(`Synced ${fixtures.length} fixtures`)
    } else {
      results.push("No fixtures from API (cached or unavailable)")
    }

    const liveFixtures = await fetchLiveFixtures()
    if (liveFixtures.length > 0) {
      await syncLiveFixtures(liveFixtures)
      results.push(`Synced ${liveFixtures.length} live fixtures`)
    }

    const liveMatches = await db.select().from(match).where(eq(match.status, "live"))
    let eventsCount = 0
    for (const m of liveMatches) {
      if (m.externalId) {
        const events = await fetchFixtureEvents(m.externalId)
        if (events.length > 0) {
          await syncEvents(m.id, m.externalId, events)
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

async function syncFixtures(fixtures: ApiFootballFixture[]) {
  for (const f of fixtures) {
    const extId = f.fixture.id
    const home = f.teams.home.name
    const away = f.teams.away.name
    const kickoff = new Date(f.fixture.date)
    const stage = f.league?.round ?? null
    const venue = f.fixture.venue?.name ?? null

    let status: string = "scheduled"
    if (f.fixture.status.short === "1H" || f.fixture.status.short === "2H" || f.fixture.status.short === "HT" || f.fixture.status.short === "ET" || f.fixture.status.short === "P" || f.fixture.status.short === "BT") {
      status = "live"
    } else if (f.fixture.status.short === "FT" || f.fixture.status.short === "AET" || f.fixture.status.short === "PEN") {
      status = "finished"
    }

    await db
      .insert(match)
      .values({
        externalId: extId,
        homeTeam: home,
        awayTeam: away,
        homeTeamCode: home.slice(0, 3).toUpperCase(),
        awayTeamCode: away.slice(0, 3).toUpperCase(),
        kickoff,
        stage,
        venue,
        status,
        elapsed: f.fixture.status.elapsed,
        homeScore: f.goals.home ?? 0,
        awayScore: f.goals.away ?? 0,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: match.externalId,
        set: {
          status,
          elapsed: f.fixture.status.elapsed,
          homeScore: f.goals.home ?? 0,
          awayScore: f.goals.away ?? 0,
          lastSyncedAt: new Date(),
        },
      })
  }
}

async function syncLiveFixtures(fixtures: ApiFootballFixture[]) {
  for (const f of fixtures) {
    const extId = f.fixture.id
    let status: string = "live"
    if (f.fixture.status.short === "FT" || f.fixture.status.short === "AET" || f.fixture.status.short === "PEN") {
      status = "finished"
    }

    await db
      .update(match)
      .set({
        status,
        elapsed: f.fixture.status.elapsed,
        homeScore: f.goals.home ?? 0,
        awayScore: f.goals.away ?? 0,
        lastSyncedAt: new Date(),
      })
      .where(eq(match.externalId, extId))
  }
}

async function syncEvents(matchId: number, extFixtureId: number, apiEvents: { time: { elapsed: number | null; extra: number | null }; team: { name: string }; player: { name: string | null }; type: string; detail: string }[]) {
  for (const e of apiEvents) {
    const type = e.type === "Goal" ? "goal" : e.type === "Card" ? "card" : e.type === "subst" ? "subst" : "var"
    await db
      .insert(matchEvent)
      .values({
        matchId,
        type,
        detail: e.detail,
        player: e.player.name,
        team: e.team.name,
        minute: e.time.elapsed,
        extraMinute: e.time.extra,
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
    const status = result === "won" ? "won" : "lost"

    await db.transaction(async (tx) => {
      await tx.update(bet).set({ status, payout, settledAt: new Date() }).where(eq(bet.id, b.id))

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
