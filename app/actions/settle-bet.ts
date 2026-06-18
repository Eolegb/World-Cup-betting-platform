"use server"

import { db } from "@/lib/db"
import { match, bet, profile, ledger, matchEvent } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { eq, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function settleSingleBet(betId: number) {
  await requireAdmin()

  const [b] = await db.select().from(bet).where(eq(bet.id, betId)).limit(1)
  if (!b) return { ok: false as const, error: "Pari introuvable." }
  if (b.status !== "pending") return { ok: false as const, error: `Déjà ${b.status === "won" ? "gagné" : "perdu"}.` }

  const [m] = await db.select().from(match).where(eq(match.id, b.matchId)).limit(1)
  if (!m) return { ok: false as const, error: "Match introuvable." }
  if (m.status !== "finished") return { ok: false as const, error: "Le match n'est pas encore terminé." }

  const events = await db.select().from(matchEvent).where(and(eq(matchEvent.matchId, m.id), eq(matchEvent.type, "goal"))).orderBy(matchEvent.minute)

  const goals: GoalEvent[] = events.map(e => ({
    player: e.player,
    team: e.team === m.homeTeam ? "home" as const : "away" as const,
    minute: e.minute ?? 0,
  }))

  const resolvable: ResolvableMatch = {
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    goals,
  }

  const result = resolveBet(resolvable, {
    marketType: b.marketType,
    selection: b.selection as Record<string, unknown>,
    minuteFrom: b.minuteFrom,
    minuteTo: b.minuteTo,
  })

  const payout = result === "won" ? b.potentialPayout : 0
  const newStatus = result === "won" ? "won" as const : "lost" as const

  await db.transaction(async (tx) => {
    await tx.update(bet).set({ status: newStatus, payout, settledAt: new Date() }).where(eq(bet.id, b.id))
    if (payout > 0) {
      const [p] = await tx.update(profile).set({ balance: sql`${profile.balance} + ${payout}`, balanceBackup: sql`${profile.balance}` }).where(eq(profile.userId, b.userId)).returning()
      await tx.insert(ledger).values({ userId: b.userId, betId: b.id, amount: payout, balanceAfter: p.balance, reason: `Gain: ${b.label}` })
    }
  })

  revalidatePath("/admin")
  return { ok: true as const, status: newStatus, payout }
}
