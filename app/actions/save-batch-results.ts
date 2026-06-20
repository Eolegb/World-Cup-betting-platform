"use server"

import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import { settlePendingBetsForMatch } from "@/lib/settle-match"
import { teamsMatch } from "@/lib/team-name"
import { eq } from "drizzle-orm"
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
  const existingMatches = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, status: match.status })
    .from(match)

  for (const m of matches) {
    const existing = existingMatches.find((row) => teamsMatch(row.homeTeam, m.homeTeam) && teamsMatch(row.awayTeam, m.awayTeam))

    if (!existing) continue
    if (existing.status === "finished") {
      const result = await settlePendingBetsForMatch(existing.id)
      settled += result.settled
      continue
    }

    await db.update(match).set({ status: "finished", homeScore: m.homeScore, awayScore: m.awayScore, elapsed: 90, lastSyncedAt: new Date() }).where(eq(match.id, existing.id))
    updated++

    for (const g of m.goals) {
      if (!g.player?.trim()) continue
      await db.insert(matchEvent).values({ matchId: existing.id, type: "goal", detail: "REGULAR", player: g.player.trim(), team: g.team, minute: g.minute }).onConflictDoNothing()
    }

    // Fill missing goals for bet resolution
    let storedGoals = m.goals.filter((g) => teamsMatch(g.team, existing.homeTeam)).length
    while (storedGoals < m.homeScore) {
      await db.insert(matchEvent).values({ matchId: existing.id, type: "goal", detail: "REGULAR", player: `${existing.homeTeam} Buteur`, team: existing.homeTeam, minute: Math.floor(Math.random() * 90) + 1 }).onConflictDoNothing()
      storedGoals++
    }
    let storedAway = m.goals.filter((g) => teamsMatch(g.team, existing.awayTeam)).length
    while (storedAway < m.awayScore) {
      await db.insert(matchEvent).values({ matchId: existing.id, type: "goal", detail: "REGULAR", player: `${existing.awayTeam} Buteur`, team: existing.awayTeam, minute: Math.floor(Math.random() * 90) + 1 }).onConflictDoNothing()
      storedAway++
    }

    const result = await settlePendingBetsForMatch(existing.id)
    settled += result.settled
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/classement")
  revalidatePath("/mes-paris")

  return { ok: true as const, updated, settled }
}
