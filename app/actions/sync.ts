"use server"

import { requireAdmin } from "@/lib/session"
import { runSync } from "@/lib/sync"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { match } from "@/lib/db/schema"
import { settlePendingBetsForMatch } from "@/lib/settle-match"
import { and, eq, lt, or } from "drizzle-orm"

export async function triggerSync() {
  await requireAdmin()
  const data = await runSync()
  revalidatePath("/")
  revalidatePath("/admin")
  return data
}

export async function forceCloseAllPastMatches() {
  await requireAdmin()

  const cutoff = new Date(Date.now() - 130 * 60 * 1000)
  const stale = await db
    .select({ id: match.id })
    .from(match)
    .where(and(or(eq(match.status, "scheduled"), eq(match.status, "live")), lt(match.kickoff, cutoff)))

  let closed = 0
  let settled = 0
  for (const m of stale) {
    await db
      .update(match)
      .set({ status: "finished", elapsed: 90, lastSyncedAt: new Date() })
      .where(eq(match.id, m.id))
    closed++
    try {
      const summary = await settlePendingBetsForMatch(m.id)
      settled += summary.settled
    } catch {
      // ignore
    }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/mes-paris")

  return { ok: true as const, closed, settled }
}
