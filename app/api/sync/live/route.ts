import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, ledger } from "@/lib/db/schema"
import { fetchMatchDetail } from "@/lib/providers"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { and, eq, lt, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Find scheduled matches that should be finished (kickoff > 105 min ago)
    const cutoff = new Date(Date.now() - 105 * 60 * 1000)
    const candidates = await db.select().from(match).where(and(eq(match.status, "scheduled"), lt(match.kickoff, cutoff)))

    let updated = 0
    let eventsAdded = 0
    let betsSettled = 0

    for (const m of candidates) {
      if (!m.externalId) continue

      const detail = await fetchMatchDetail(m.externalId)
      if (!detail || detail.status !== "FINISHED") continue

      const homeScore = detail.score.fullTime.home ?? 0
      const awayScore = detail.score.fullTime.away ?? 0

      await db.update(match).set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: new Date() }).where(eq(match.id, m.id))
      updated++

      // Store goals
      if (detail.goals) {
        for (const g of detail.goals) {
          await db.insert(matchEvent).values({ matchId: m.id, type: "goal", detail: g.type ?? "REGULAR", player: g.scorer?.name ?? null, team: g.team?.name ?? "", minute: g.minute, extraMinute: g.extraTime }).onConflictDoNothing()
          eventsAdded++
        }
      }

      // Settle bets
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
  const goals: GoalEvent[] = events.map(e => ({ player: e.player, team: e.team === m.homeTeam ? "home" as const : "away" as const, minute: e.minute ?? 0 }))

  // If no events in DB, try API one last time
  if (goals.length === 0 && m.externalId) {
    const detail = await fetchMatchDetail(m.externalId)
    if (detail?.goals) {
      for (const g of detail.goals) {
        goals.push({ player: g.scorer?.name ?? null, team: g.team?.name === m.homeTeam ? "home" : "away", minute: g.minute })
        await db.insert(matchEvent).values({ matchId: m.id, type: "goal", detail: g.type ?? "REGULAR", player: g.scorer?.name ?? null, team: g.team?.name ?? "", minute: g.minute, extraMinute: g.extraTime }).onConflictDoNothing()
      }
    }
  }

  const resolvable: ResolvableMatch = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: m.homeScore, awayScore: m.awayScore, goals }

  let settled = 0
  for (const b of pendingBets) {
    const result = resolveBet(resolvable, { marketType: b.marketType, selection: b.selection as Record<string, unknown>, minuteFrom: b.minuteFrom, minuteTo: b.minuteTo })
    const payout = result === "won" ? b.potentialPayout : 0
    const newStatus = result === "won" ? "won" : "lost"

    await db.transaction(async tx => {
      await tx.update(bet).set({ status: newStatus, payout, settledAt: new Date() }).where(eq(bet.id, b.id))
      if (payout > 0) {
        const [p] = await tx.update(profile).set({ balance: sql`${profile.balance} + ${payout}`, balanceBackup: sql`${profile.balance}` }).where(eq(profile.userId, b.userId)).returning()
        await tx.insert(ledger).values({ userId: b.userId, betId: b.id, amount: payout, balanceAfter: p.balance, reason: `Gain: ${b.label}` })
      }
    })
    settled++
  }
  return settled
}
