"use server"

import { db } from "@/lib/db"
import { bet, profile, ledger } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function overrideBet(betId: number, newStatus: "won" | "lost" | "pending") {
  await requireAdmin()

  const [b] = await db.select().from(bet).where(eq(bet.id, betId)).limit(1)
  if (!b) return { ok: false as const, error: "Pari introuvable." }

  const oldStatus = b.status

  // If changing from won to something else, remove the payout
  if (oldStatus === "won" && newStatus !== "won") {
    await db.transaction(async (tx) => {
      // Refund the payout
      const [p] = await tx.update(profile)
        .set({ balance: sql`${profile.balance} - ${b.payout}` })
        .where(eq(profile.userId, b.userId))
        .returning()

      await tx.update(bet).set({ status: newStatus, payout: 0, settledAt: null }).where(eq(bet.id, b.id))

      await tx.insert(ledger).values({
        userId: b.userId, betId: b.id, amount: -b.payout,
        balanceAfter: p.balance, reason: `Correction admin: ${b.label}`,
      })
    })
  }
  // If changing to won from something else, credit the payout
  else if (oldStatus !== "won" && newStatus === "won") {
    const payout = b.potentialPayout

    await db.transaction(async (tx) => {
      const [p] = await tx.update(profile)
        .set({ balance: sql`${profile.balance} + ${payout}` })
        .where(eq(profile.userId, b.userId))
        .returning()

      await tx.update(bet).set({ status: newStatus, payout, settledAt: new Date() }).where(eq(bet.id, b.id))

      await tx.insert(ledger).values({
        userId: b.userId, betId: b.id, amount: payout,
        balanceAfter: p.balance, reason: `Correction admin: ${b.label}`,
      })
    })
  }
  // Just change status (e.g., pending ↔ lost)
  else {
    await db.update(bet).set({ status: newStatus }).where(eq(bet.id, b.id))
  }

  revalidatePath("/admin")
  return { ok: true as const, oldStatus, newStatus }
}
