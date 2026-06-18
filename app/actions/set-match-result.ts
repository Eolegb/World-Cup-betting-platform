"use server"

import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, ledger } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { eq, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type GoalInput = { player: string; minute: number }

export async function setMatchResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  goals: GoalInput[]
) {
  await requireAdmin()

  // Update match
  await db.update(match).set({
    status: "finished",
    homeScore,
    awayScore,
    elapsed: 90,
    lastSyncedAt: new Date(),
  }).where(eq(match.id, matchId))

  // Add goal events
  for (const g of goals) {
    if (!g.player.trim()) continue
    await db.insert(matchEvent).values({
      matchId,
      type: "goal",
      detail: "Normal Goal",
      player: g.player.trim(),
      team: "", // will be inferred during resolution
      minute: g.minute,
    }).onConflictDoNothing()
  }

  // Settle all pending bets for this match
  const [m] = await db.select().from(match).where(eq(match.id, matchId)).limit(1)
  if (!m) return { ok: false as const, error: "Match introuvable." }

  const pendingBets = await db.select().from(bet)
    .where(and(eq(bet.matchId, matchId), eq(bet.status, "pending")))

  const events = await db.select().from(matchEvent)
    .where(and(eq(matchEvent.matchId, matchId), eq(matchEvent.type, "goal")))
    .orderBy(matchEvent.minute)

  // Guess which team each goal belongs to
  let homeGoals = 0; let awayGoals = 0
  const goalEvents: GoalEvent[] = events.map(e => {
    const isHome = homeGoals < homeScore
    if (isHome) homeGoals++; else awayGoals++
    return { player: e.player, team: (isHome ? "home" : "away") as "home" | "away", minute: e.minute ?? 0 }
  })

  const resolvable: ResolvableMatch = {
    homeTeam: m.homeTeam, awayTeam: m.awayTeam,
    homeScore, awayScore, goals: goalEvents,
  }

  let won = 0; let lost = 0
  for (const b of pendingBets) {
    const result = resolveBet(resolvable, {
      marketType: b.marketType,
      selection: b.selection as Record<string, unknown>,
      minuteFrom: b.minuteFrom, minuteTo: b.minuteTo,
    })
    const payout = result === "won" ? b.potentialPayout : 0
    const newStatus = result === "won" ? "won" as const : "lost" as const

    await db.transaction(async tx => {
      await tx.update(bet).set({ status: newStatus, payout, settledAt: new Date() }).where(eq(bet.id, b.id))
      if (payout > 0) {
        const [p] = await tx.update(profile)
          .set({ balance: sql`${profile.balance} + ${payout}`, balanceBackup: sql`${profile.balance}` })
          .where(eq(profile.userId, b.userId)).returning()
        await tx.insert(ledger).values({
          userId: b.userId, betId: b.id, amount: payout,
          balanceAfter: p.balance, reason: `Gain: ${b.label}`,
        })
      }
    })

    if (result === "won") won++; else lost++
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true as const, settled: pendingBets.length, won, lost }
}
