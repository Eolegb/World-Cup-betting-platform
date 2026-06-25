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

  // Invalidation agressive de tout le cache
  revalidatePath("/", "layout")
  revalidatePath("/admin", "layout")
  revalidatePath("/match", "layout")
  revalidatePath("/api/matches")

  return data
}

export async function getMatchCounts() {
  await requireAdmin()

  const rows = await db
    .select({ status: match.status })
    .from(match)

  const counts = { scheduled: 0, live: 0, finished: 0, total: rows.length }
  for (const r of rows) {
    if (r.status === "scheduled") counts.scheduled++
    else if (r.status === "live") counts.live++
    else if (r.status === "finished") counts.finished++
  }

  // Récupérer les 5 prochains matchs scheduled pour vérifier
  const upcoming = await db
    .select({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: match.kickoff,
      stage: match.stage,
      status: match.status,
    })
    .from(match)
    .where(eq(match.status, "scheduled"))
    .orderBy(match.kickoff)
    .limit(10)

  return { ok: true as const, counts, upcoming }
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
