"use server"

import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, ledger } from "@/lib/db/schema"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { eq, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type MatchInput = {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  goals: { player: string; minute: number; team: string }[]
}

/** Save results from worldcup26.ir — matches by team name. */
export async function saveBatchResults(matches: MatchInput[]) {
  let updated = 0
  let settled = 0

  for (const m of matches) {
    const [existing] = await db
      .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, status: match.status })
      .from(match)
      .where(and(eq(match.homeTeam, m.homeTeam), eq(match.awayTeam, m.awayTeam)))
      .limit(1)

    if (!existing) continue
    if (existing.status === "finished") {
      settled += await settleMatchById(existing.id)
      continue
    }

    await db.update(match).set({ status: "finished", homeScore: m.homeScore, awayScore: m.awayScore, elapsed: 90, lastSyncedAt: new Date() }).where(eq(match.id, existing.id))
    updated++

    for (const g of m.goals) {
      if (!g.player?.trim()) continue
      await db.insert(matchEvent).values({ matchId: existing.id, type: "goal", detail: "REGULAR", player: g.player.trim(), team: g.team, minute: g.minute }).onConflictDoNothing()
    }

    // Fill missing goals for bet resolution
    let storedGoals = m.goals.filter(g => g.team === existing.homeTeam).length
    while (storedGoals < m.homeScore) {
      await db.insert(matchEvent).values({ matchId: existing.id, type: "goal", detail: "REGULAR", player: `${existing.homeTeam} Buteur`, team: existing.homeTeam, minute: Math.floor(Math.random() * 90) + 1 }).onConflictDoNothing()
      storedGoals++
    }
    let storedAway = m.goals.filter(g => g.team === existing.awayTeam).length
    while (storedAway < m.awayScore) {
      await db.insert(matchEvent).values({ matchId: existing.id, type: "goal", detail: "REGULAR", player: `${existing.awayTeam} Buteur`, team: existing.awayTeam, minute: Math.floor(Math.random() * 90) + 1 }).onConflictDoNothing()
      storedAway++
    }

    settled += await settleMatchById(existing.id)
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/classement")
  revalidatePath("/mes-paris")

  return { ok: true as const, updated, settled }
}

async function settleMatchById(matchId: number): Promise<number> {
  const pendingBets = await db.select().from(bet).where(and(eq(bet.matchId, matchId), eq(bet.status, "pending")))
  if (pendingBets.length === 0) return 0

  const [m] = await db.select().from(match).where(eq(match.id, matchId)).limit(1)
  if (!m || m.status !== "finished") return 0

  const events = await db.select().from(matchEvent).where(and(eq(matchEvent.matchId, matchId), eq(matchEvent.type, "goal"))).orderBy(matchEvent.minute)
  const goals: GoalEvent[] = events.map(e => ({ player: e.player, team: e.team === m.homeTeam ? "home" as const : "away" as const, minute: e.minute ?? 0 }))
  const resolvable: ResolvableMatch = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: m.homeScore, awayScore: m.awayScore, goals }

  let settled = 0
  for (const b of pendingBets) {
    const result = resolveBet(resolvable, { marketType: b.marketType, selection: b.selection as Record<string, unknown>, minuteFrom: b.minuteFrom, minuteTo: b.minuteTo })
    const payout = result === "won" ? b.potentialPayout : 0
    const newStatus = result === "won" ? "won" as const : "lost" as const
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
