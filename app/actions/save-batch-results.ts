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
  elapsed?: number
  finished: boolean
  goals: { player: string; minute: number; team: string }[]
}

/** Sauvegarde les résultats depuis worldcup26.ir — matchs identifiés par nom d'équipe. */
export async function saveBatchResults(matches: MatchInput[]) {
  let updated = 0
  let settled = 0
  const existingMatches = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, status: match.status })
    .from(match)

  for (const m of matches) {
    const existing = existingMatches.find(
      (row) => teamsMatch(row.homeTeam, m.homeTeam) && teamsMatch(row.awayTeam, m.awayTeam),
    )
    if (!existing) continue

    if (m.finished) {
      // -----------------------------------------------------------------------
      // Match terminé : on met à jour le score final et on règle les paris
      // -----------------------------------------------------------------------
      if (existing.status === "finished") {
        // Déjà clôturé — tenter un rattrapage des paris encore pending
        const result = await settlePendingBetsForMatch(existing.id)
        settled += result.settled
        continue
      }

      await db
        .update(match)
        .set({
          status: "finished",
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          elapsed: 90,
          lastSyncedAt: new Date(),
        })
        .where(eq(match.id, existing.id))
      updated++

      // Insérer les buts
      for (const g of m.goals) {
        if (!g.player?.trim()) continue
        await db
          .insert(matchEvent)
          .values({
            matchId: existing.id,
            type: "goal",
            detail: "REGULAR",
            player: g.player.trim(),
            team: g.team,
            minute: g.minute,
          })
          .onConflictDoNothing()
      }

      // Compléter les buts manquants pour la résolution des paris
      let storedHome = m.goals.filter((g) => teamsMatch(g.team, existing.homeTeam)).length
      while (storedHome < m.homeScore) {
        await db
          .insert(matchEvent)
          .values({
            matchId: existing.id,
            type: "goal",
            detail: "REGULAR",
            player: `${existing.homeTeam} Buteur`,
            team: existing.homeTeam,
            minute: Math.floor(Math.random() * 90) + 1,
          })
          .onConflictDoNothing()
        storedHome++
      }
      let storedAway = m.goals.filter((g) => teamsMatch(g.team, existing.awayTeam)).length
      while (storedAway < m.awayScore) {
        await db
          .insert(matchEvent)
          .values({
            matchId: existing.id,
            type: "goal",
            detail: "REGULAR",
            player: `${existing.awayTeam} Buteur`,
            team: existing.awayTeam,
            minute: Math.floor(Math.random() * 90) + 1,
          })
          .onConflictDoNothing()
        storedAway++
      }

      const result = await settlePendingBetsForMatch(existing.id)
      settled += result.settled
    } else if (existing.status === "live" || existing.status === "scheduled") {
      // -----------------------------------------------------------------------
      // Match en cours : mise à jour du score + passage scheduled → live
      // -----------------------------------------------------------------------
      await db
        .update(match)
        .set({
          status: "live",
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          elapsed: m.elapsed ?? undefined,
          lastSyncedAt: new Date(),
        })
        .where(eq(match.id, existing.id))
      updated++
    }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/classement")
  revalidatePath("/mes-paris")

  return { ok: true as const, updated, settled }
}
