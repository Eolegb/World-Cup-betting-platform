"use server"

import { db } from "@/lib/db"
import { match, matchEvent, bet, profile, user as userTable, ledger } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { rosterFor } from "@/lib/teams"
import { potentialPayout } from "@/lib/markets"
import { eq } from "drizzle-orm"

const DEMO_TEAMS: [string, string, string, string][] = [
  ["France", "FRA", "Argentina", "ARG"],
  ["Brazil", "BRA", "England", "ENG"],
  ["Spain", "ESP", "Portugal", "POR"],
  ["Germany", "GER", "Netherlands", "NED"],
  ["France", "FRA", "Brazil", "BRA"],
  ["Argentina", "ARG", "Spain", "ESP"],
  ["England", "ENG", "Portugal", "POR"],
  ["Germany", "GER", "Brazil", "BRA"],
  ["Netherlands", "NED", "France", "FRA"],
  ["Spain", "ESP", "England", "ENG"],
  ["Portugal", "POR", "Germany", "GER"],
  ["Argentina", "ARG", "Netherlands", "NED"],
]

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function seedDemoData() {
  await requireAdmin()

  const existingMatches = await db.select({ id: match.id }).from(match)
  if (existingMatches.length > 0) {
    return { ok: false, error: "La base contient déjà des matchs. Vide la table match d'abord." }
  }

  const now = new Date()

  // Generate matches spread across past, present and future
  const matchIds: number[] = []
  for (let i = 0; i < DEMO_TEAMS.length; i++) {
    const [home, homeCode, away, awayCode] = DEMO_TEAMS[i]

    // Past matches (first 6), current (1 live), future (5)
    let status: string
    let kickoff: Date
    let homeScore = 0
    let awayScore = 0
    let elapsed: number | null = null

    if (i < 4) {
      // Finished
      kickoff = new Date(now.getTime() - (12 - i) * 3600000)
      status = "finished"
      homeScore = randomInt(0, 4)
      awayScore = randomInt(0, 3)
    } else if (i < 5) {
      // Live
      kickoff = new Date(now.getTime() - 45 * 60000)
      status = "live"
      homeScore = randomInt(0, 2)
      awayScore = randomInt(0, 1)
      elapsed = 45 + randomInt(0, 15)
    } else {
      // Scheduled (future)
      kickoff = new Date(now.getTime() + (i - 4) * 86400000)
      status = "scheduled"
    }

    const [created] = await db
      .insert(match)
      .values({
        homeTeam: home,
        awayTeam: away,
        homeTeamCode: homeCode,
        awayTeamCode: awayCode,
        kickoff,
        stage: i < 4 ? "Phase de groupes" : i < 8 ? "Huitièmes de finale" : "Quarts de finale",
        venue: pick(["Stade Lusail", "Stade Al Bayt", "Stade 974", "Stade Al Janoub", "Stade Education City"]),
        status,
        elapsed,
        homeScore,
        awayScore,
      })
      .returning()

    matchIds.push(created.id)
  }

  // Generate goal events for finished & live matches
  for (const mId of matchIds) {
    const m = await db.select().from(match).where(eq(match.id, mId)).limit(1).then((r) => r[0])
    if (!m || m.status === "scheduled") continue

    const totalGoals = m.homeScore + m.awayScore

    for (let g = 0; g < totalGoals; g++) {
      const scoringTeam = g < m.homeScore ? m.homeTeam : m.awayTeam
      const teamPlayers = rosterFor(scoringTeam)
      const scorer = pick(teamPlayers)
      const minute = randomInt(1, 90)

      await db.insert(matchEvent).values({
        matchId: m.id,
        type: "goal",
        detail: "Normal Goal",
        player: scorer,
        team: scoringTeam,
        minute,
      })
    }
  }

  // Generate some demo bets for the first finished match
  const existingUsers = await db.select({ id: userTable.id, name: userTable.name }).from(userTable)
  if (existingUsers.length > 0 && matchIds.length > 0) {
    for (const u of existingUsers.slice(0, 3)) {
      const mId = matchIds[0]
      const m = await db.select().from(match).where(eq(match.id, mId)).limit(1).then((r) => r[0])
      if (!m) continue

      // Ensure profile exists
      await db
        .insert(profile)
        .values({ userId: u.id, displayName: u.name ?? "Joueur", balance: 1000 })
        .onConflictDoNothing()

      const betSelections = [
        {
          marketType: "match_result",
          label: `Resultat du match: ${m.homeTeam} gagne`,
          selection: { side: "home", __key: "home" },
          odds: 2.4,
          stake: 100,
        },
        {
          marketType: "totals",
          label: "Total de buts (2.5): Plus de 2.5 buts",
          selection: { line: 2.5, side: "over", __key: "over" },
          odds: 1.9,
          stake: 50,
        },
        {
          marketType: "btts",
          label: "Les deux equipes marquent: Oui",
          selection: { yes: true, __key: "yes" },
          odds: 1.85,
          stake: 75,
        },
      ]

      for (const bs of betSelections) {
        const payout = potentialPayout(bs.stake, bs.odds)

        await db.transaction(async (tx) => {
          const [p] = await tx.select().from(profile).where(eq(profile.userId, u.id)).limit(1)
          if (!p || p.balance < bs.stake) return
          const newBalance = p.balance - bs.stake

          await tx.update(profile).set({ balance: newBalance }).where(eq(profile.userId, u.id))

          const [created] = await tx
            .insert(bet)
            .values({
              userId: u.id,
              matchId: mId,
              marketType: bs.marketType,
              label: bs.label,
              selection: bs.selection,
              stake: bs.stake,
              odds: bs.odds.toFixed(2),
              potentialPayout: payout,
              status: "pending",
            })
            .returning()

          await tx.insert(ledger).values({
            userId: u.id,
            betId: created.id,
            amount: -bs.stake,
            balanceAfter: newBalance,
            reason: `Mise: ${bs.label}`,
          })
        })
      }
    }
  }

  revalidatePath("/")
  revalidatePath("/mes-paris")
  revalidatePath("/classement")
  revalidatePath("/admin")

  return {
    ok: true,
    message: `${DEMO_TEAMS.length} matchs générés avec événements et paris de démo.`,
  }
}
