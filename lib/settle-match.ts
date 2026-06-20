import { db } from "@/lib/db"
import { bet, ledger, match, matchEvent, profile } from "@/lib/db/schema"
import { fetchMatchDetail } from "@/lib/providers"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { teamsMatch } from "@/lib/team-name"
import { and, eq, neq, sql } from "drizzle-orm"

export type SettlementSummary = {
  settled: number
  won: number
  lost: number
}

export async function settlePendingBetsForMatch(matchId: number): Promise<SettlementSummary> {
  const [m] = await db.select().from(match).where(eq(match.id, matchId)).limit(1)
  if (!m || m.status !== "finished") return { settled: 0, won: 0, lost: 0 }

  const pendingBets = await db.select().from(bet).where(and(eq(bet.matchId, matchId), eq(bet.status, "pending"), neq(bet.marketType, "combined")))
  if (pendingBets.length === 0) return { settled: 0, won: 0, lost: 0 }

  let events = await db
    .select()
    .from(matchEvent)
    .where(and(eq(matchEvent.matchId, matchId), eq(matchEvent.type, "goal")))
    .orderBy(matchEvent.minute)

  if (events.length === 0 && m.externalId) {
    const detail = await fetchMatchDetail(m.externalId)
    if (detail?.goals?.length) {
      for (const g of detail.goals) {
        await db.insert(matchEvent).values({
          matchId,
          type: "goal",
          detail: g.type ?? "REGULAR",
          player: g.scorer?.name ?? null,
          team: g.team?.name ?? "",
          minute: g.minute,
          extraMinute: g.extraTime,
        }).onConflictDoNothing()
      }

      events = await db
        .select()
        .from(matchEvent)
        .where(and(eq(matchEvent.matchId, matchId), eq(matchEvent.type, "goal")))
        .orderBy(matchEvent.minute)
    }
  }

  const goals: GoalEvent[] = events.map((e) => ({
    player: e.player,
    team: e.team && teamsMatch(e.team, m.homeTeam) ? "home" : "away",
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
  let won = 0
  let lost = 0
  for (const b of pendingBets) {
    const result = resolveBet(resolvable, {
      marketType: b.marketType,
      selection: b.selection as Record<string, unknown>,
      minuteFrom: b.minuteFrom,
      minuteTo: b.minuteTo,
    })

    const payout = result === "won" ? b.potentialPayout : 0
    const newStatus = result === "won" ? ("won" as const) : ("lost" as const)

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

    if (result === "won") won++
    else lost++
    settled++
  }

  return { settled, won, lost }
}
