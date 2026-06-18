"use server"

import { db } from "@/lib/db"
import { match, bet, profile, ledger, matchEvent } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { fetchMatchDetail } from "@/lib/providers"
import { resolveBet, type GoalEvent, type ResolvableMatch } from "@/lib/resolve"
import { eq, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function settleSingleBet(betId: number) {
  await requireAdmin()

  const [b] = await db.select().from(bet).where(eq(bet.id, betId)).limit(1)
  if (!b) return { ok: false as const, error: "Pari introuvable." }
  if (b.status !== "pending") return { ok: false as const, error: `Déjà ${b.status === "won" ? "gagné" : "perdu"}.` }

  let [m] = await db.select().from(match).where(eq(match.id, b.matchId)).limit(1)
  if (!m) return { ok: false as const, error: "Match introuvable." }

  // If match not finished, query the API for this specific match
  if (m.status !== "finished" && m.externalId) {
    const detail = await fetchMatchDetail(Number(m.externalId), true)
    if (!detail) {
      return { ok: false as const, error: "API indisponible (timeout Vercel 10s ou limite 10 req/min atteinte). Réessaie." }
    }

    const hasScore = detail.score.fullTime.home != null && detail.score.fullTime.away != null
    const isFinished = detail.status === "FINISHED" || hasScore

    if (!isFinished) {
      return { ok: false as const, error: `Le match n'est pas terminé (API: ${detail.status}).` }
    }

    // Update match in DB
    const homeScore = detail.score.fullTime.home ?? 0
    const awayScore = detail.score.fullTime.away ?? 0
    await db.update(match)
      .set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: new Date() })
      .where(eq(match.id, m.id))

    // Store goals
    if (detail.goals) {
      for (const g of detail.goals) {
        await db.insert(matchEvent)
          .values({ matchId: m.id, type: "goal", detail: g.type ?? "REGULAR", player: g.scorer?.name ?? null, team: g.team?.name ?? "", minute: g.minute, extraMinute: g.extraTime })
          .onConflictDoNothing()
      }
    }

    // Re-fetch
    const [updated] = await db.select().from(match).where(eq(match.id, b.matchId)).limit(1)
    if (updated) m = updated
  } else if (m.status !== "finished") {
    return { ok: false as const, error: "Le match n'est pas encore terminé." }
  }

  // Fetch goal events
  const events = await db.select().from(matchEvent)
    .where(and(eq(matchEvent.matchId, m.id), eq(matchEvent.type, "goal")))
    .orderBy(matchEvent.minute)

  const goals: GoalEvent[] = events.map(e => ({
    player: e.player,
    team: e.team === m.homeTeam ? "home" as const : "away" as const,
    minute: e.minute ?? 0,
  }))

  const resolvable: ResolvableMatch = {
    homeTeam: m.homeTeam, awayTeam: m.awayTeam,
    homeScore: m.homeScore, awayScore: m.awayScore, goals,
  }

  const result = resolveBet(resolvable, {
    marketType: b.marketType,
    selection: b.selection as Record<string, unknown>,
    minuteFrom: b.minuteFrom, minuteTo: b.minuteTo,
  })

  const payout = result === "won" ? b.potentialPayout : 0
  const newStatus = result === "won" ? "won" as const : "lost" as const

  await db.transaction(async (tx) => {
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

  revalidatePath("/admin")
  return { ok: true as const, status: newStatus, payout }
}
