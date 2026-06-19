"use server"

import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function saveMatchResult(
  matchId: number,
  status: string,
  homeScore: number,
  awayScore: number,
  goals: { player: string; minute: number; team: string }[]
) {
  await requireAdmin()

  await db.update(match).set({
    status,
    homeScore,
    awayScore,
    elapsed: status === "finished" ? 90 : null,
    lastSyncedAt: new Date(),
  }).where(eq(match.id, matchId))

  let stored = 0
  for (const g of goals) {
    if (!g.player?.trim()) continue
    await db.insert(matchEvent).values({
      matchId,
      type: "goal",
      detail: "REGULAR",
      player: g.player.trim(),
      team: g.team,
      minute: g.minute,
    }).onConflictDoNothing()
    stored++
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true as const, goals: stored }
}
