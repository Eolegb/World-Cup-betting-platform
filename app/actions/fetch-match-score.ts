"use server"

import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { fetchMatchDetail } from "@/lib/providers"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function fetchMatchScore(matchId: number, externalId: number) {
  await requireAdmin()

  const detail = await fetchMatchDetail(externalId, true)
  if (!detail) return { ok: false as const, error: "API indisponible." }

  const status = detail.status === "FINISHED" ? "finished" : "scheduled"
  const homeScore = detail.score.fullTime.home ?? 0
  const awayScore = detail.score.fullTime.away ?? 0

  await db.update(match).set({
    status,
    homeScore,
    awayScore,
    elapsed: status === "finished" ? 90 : null,
    lastSyncedAt: new Date(),
  }).where(eq(match.id, matchId))

  // Store goals
  let goals = 0
  if (detail.goals) {
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
      goals++
    }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return {
    ok: true as const,
    status,
    homeScore,
    awayScore,
    goals,
    apiStatus: detail.status,
  }
}
