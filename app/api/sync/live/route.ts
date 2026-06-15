import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, ledger } from "@/lib/db/schema"
import { fetchLiveFixtures, fetchMatchDetail } from "@/lib/providers"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { and, eq, lt, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const fixtures = await fetchLiveFixtures()
    const liveFixtureIds = new Set(fixtures.map(f => f.id))
    let updated = 0
    let eventsAdded = 0
    let betsSettled = 0

    for (const f of fixtures) {
      const [existing] = await db.select({ id: match.id, oldStatus: match.status }).from(match).where(eq(match.externalId, f.id)).limit(1)
      if (!existing) continue

      const isFinished = f.status === "FINISHED"
      const status = isFinished ? "finished" : "live"
      const homeScore = f.score.fullTime.home ?? 0
      const awayScore = f.score.fullTime.away ?? 0

      await db.update(match).set({ status, homeScore, awayScore, elapsed: isFinished ? 90 : null, lastSyncedAt: new Date() }).where(eq(match.id, existing.id))
      updated++

      if (!isFinished) {
        const detail = await fetchMatchDetail(f.id)
        if (detail?.goals) {
          for (const g of detail.goals) {
            await db.insert(matchEvent).values({ matchId: existing.id, type: "goal", detail: g.type ?? "REGULAR", player: g.scorer?.name ?? null, team: g.team?.name ?? "", minute: g.minute, extraMinute: g.extraTime }).onConflictDoNothing()
            eventsAdded++
          }
        }
      }

      if (isFinished && existing.oldStatus !== "finished") {
        betsSettled += await settleMatch(existing.id)
      }
    }

    // Detect stale live matches (finished but not updated in DB)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const staleLive = await db.select().from(match).where(and(eq(match.status, "live"), lt(match.kickoff, twoHoursAgo)))

    for (const m of staleLive) {
      if (!m.externalId) continue
      if (liveFixtureIds.has(m.externalId)) continue

      const detail = await fetchMatchDetail(m.externalId)
      if (!detail || detail.status !== "FINISHED") continue

      const homeScore = detail.score.fullTime.home ?? 0
      const awayScore = detail.score.fullTime.away ?? 0

      await db.update(match).set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: new Date() }).where(eq(match.id, m.id))
      updated++

      if (detail.goals) {
        for (const g of detail.goals) {
          await db.insert(matchEvent).values({ matchId: m.id, type: "goal", detail: g.type ?? "REGULAR", player: g.scorer?.name ?? null, team: g.team?.name ?? "", minute: g.minute, extraMinute: g.extraTime }).onConflictDoNothing()
          eventsAdded++
        }
      }

      betsSettled += await settleMatch(m.id)
    }

    return NextResponse.json({ ok: true, updated, eventsAdded, betsSettled })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

async function settleMatch(matchId: number): Promise<number> {
  const [m] = await db.select().from(match).where(eq(match.id, matchId)).limit(1)
  if (!m || m.status !== "finished") return 0

  const pendingBets = await db.select().from(bet).where(and(eq(bet.matchId, m.id), eq(bet.status, "pending")))
  if (pendingBets.length === 0) return 0

  const events = await db.select().from(matchEvent).where(and(eq(matchEvent.matchId, m.id), eq(matchEvent.type, "goal"))).orderBy(matchEvent.minute)

  const goals: GoalEvent[] = events.map(e => ({ player: e.player, team: e.team === m.homeTeam ? "home" : "away", minute: e.minute ?? 0 }))
  const resolvable: ResolvableMatch = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: m.homeScore, awayScore: m.awayScore, goals }

  let settled = 0
  for (const b of pendingBets) {
    const result = resolveBet(resolvable, { marketType: b.marketType, selection: b.selection as Record<string, unknown>, minuteFrom: b.minuteFrom, minuteTo: b.minuteTo })
    const payout = result === "won" ? b.potentialPayout : 0
    const newStatus = result === "won" ? "won" : "lost"

    await db.transaction(async tx => {
      await tx.update(bet).set({ status: newStatus, payout, settledAt: new Date() }).where(eq(bet.id, b.id))
      if (payout > 0) {
        const [p] = await tx.update(profile).set({ balance: sql`${profile.balance} + ${payout}` }).where(eq(profile.userId, b.userId)).returning()
        await tx.insert(ledger).values({ userId: b.userId, betId: b.id, amount: payout, balanceAfter: p.balance, reason: `Gain: ${b.label}` })
      }
    })
    settled++
  }
  return settled
}
