"use server"

import { db } from "@/lib/db"
import { bet, ledger, profile } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { potentialPayout } from "@/lib/markets"
import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type PlaceBetInput = {
  matchId: number
  marketType: string
  label: string
  selection: Record<string, unknown>
  odds: number
  stake: number
  minuteFrom?: number | null
  minuteTo?: number | null
}

export async function placeBet(input: PlaceBetInput) {
  const userId = await getUserId()

  const stake = Math.floor(input.stake)
  if (!Number.isFinite(stake) || stake <= 0) {
    return { ok: false as const, error: "Mise invalide." }
  }
  const odds = Math.round(input.odds * 100) / 100
  if (!Number.isFinite(odds) || odds <= 1) {
    return { ok: false as const, error: "Cote invalide." }
  }

  // Run debit + bet insert atomically so balance can never go negative.
  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx.select().from(profile).where(eq(profile.userId, userId)).limit(1)
      if (!rows.length) throw new Error("PROFILE_MISSING")
      const current = rows[0]
      if (current.balance < stake) throw new Error("INSUFFICIENT")

      const newBalance = current.balance - stake
      await tx.update(profile).set({ balance: newBalance }).where(eq(profile.userId, userId))

      const [created] = await tx
        .insert(bet)
        .values({
          userId,
          matchId: input.matchId,
          marketType: input.marketType,
          label: input.label,
          selection: input.selection,
          minuteFrom: input.minuteFrom ?? null,
          minuteTo: input.minuteTo ?? null,
          stake,
          odds: odds.toFixed(2),
          potentialPayout: potentialPayout(stake, odds),
          status: "pending",
        })
        .returning()

      await tx.insert(ledger).values({
        userId,
        betId: created.id,
        amount: -stake,
        balanceAfter: newBalance,
        reason: `Mise: ${input.label}`,
      })

      return { balance: newBalance, betId: created.id }
    })

    revalidatePath("/")
    revalidatePath("/mes-paris")
    revalidatePath(`/match/${input.matchId}`)
    return { ok: true as const, balance: result.balance }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR"
    if (msg === "INSUFFICIENT") return { ok: false as const, error: "Solde insuffisant pour cette mise." }
    if (msg === "PROFILE_MISSING") return { ok: false as const, error: "Profil introuvable." }
    return { ok: false as const, error: "Impossible de placer le pari." }
  }
}

/** Cancel a still-pending bet on a match that hasn't started; refunds the stake. */
export async function cancelBet(betId: number) {
  const userId = await getUserId()
  try {
    const newBalance = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(bet)
        .where(and(eq(bet.id, betId), eq(bet.userId, userId)))
        .limit(1)
      if (!rows.length) throw new Error("NOT_FOUND")
      const b = rows[0]
      if (b.status !== "pending") throw new Error("NOT_PENDING")

      await tx.delete(bet).where(eq(bet.id, betId))
      const [p] = await tx
        .update(profile)
        .set({ balance: sql`${profile.balance} + ${b.stake}` })
        .where(eq(profile.userId, userId))
        .returning()

      await tx.insert(ledger).values({
        userId,
        betId: null,
        amount: b.stake,
        balanceAfter: p.balance,
        reason: `Annulation: ${b.label}`,
      })
      return p.balance
    })
    revalidatePath("/")
    revalidatePath("/mes-paris")
    return { ok: true as const, balance: newBalance }
  } catch {
    return { ok: false as const, error: "Annulation impossible (pari déjà résolu ou match commencé)." }
  }
}
