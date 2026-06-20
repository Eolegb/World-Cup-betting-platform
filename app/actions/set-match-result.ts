"use server"

import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { settlePendingBetsForMatch } from "@/lib/settle-match"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type GoalInput = { player: string; minute: number }

export async function setMatchResult(matchId: number, homeScore: number, awayScore: number, goals: GoalInput[]) {
  await requireAdmin()

  await db
    .update(match)
    .set({
      status: "finished",
      homeScore,
      awayScore,
      elapsed: 90,
      lastSyncedAt: new Date(),
    })
    .where(eq(match.id, matchId))

  const [m] = await db.select().from(match).where(eq(match.id, matchId)).limit(1)
  if (!m) return { ok: false as const, error: "Match introuvable." }

  let homeGoals = 0
  let awayGoals = 0
  for (const g of goals) {
    if (!g.player.trim()) continue
    const isHome = homeGoals < homeScore
    if (isHome) homeGoals++
    else awayGoals++

    await db
      .insert(matchEvent)
      .values({
        matchId,
        type: "goal",
        detail: "Normal Goal",
        player: g.player.trim(),
        team: isHome ? m.homeTeam : m.awayTeam,
        minute: g.minute,
      })
      .onConflictDoNothing()
  }

  const summary = await settlePendingBetsForMatch(matchId)

  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true as const, ...summary }
}
