import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import { fetchMatchDetail } from "@/lib/providers"
import { settlePendingBetsForMatch } from "@/lib/settle-match"
import { getUserId } from "@/lib/session"
import { fetchGames, parseScorers, type WC26Game } from "@/lib/worldcup26"
import { teamsMatch } from "@/lib/team-name"
import { and, eq, lt, or } from "drizzle-orm"

export const dynamic = "force-dynamic"

function isCronRequest(req: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "cron-secret-change-me"
  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${expected}`) return true
  const url = new URL(req.url)
  return url.searchParams.get("secret") === expected
}

function calculateElapsed(kickoff: Date): number {
  const diffMs = Date.now() - kickoff.getTime()
  if (diffMs <= 0) return 0
  return Math.min(Math.floor(diffMs / 60000), 120)
}

async function authorize(req: Request): Promise<boolean> {
  if (isCronRequest(req)) return true
  try {
    await getUserId()
    return true
  } catch {
    return false
  }
}

/** Insère les buts d'un match worldcup26 dans matchEvent. */
async function insertWC26Goals(matchId: number, homeTeam: string, awayTeam: string, g: WC26Game) {
  const goals = [
    ...parseScorers(g.home_scorers, homeTeam),
    ...parseScorers(g.away_scorers, awayTeam),
  ]
  for (const goal of goals) {
    if (!goal.player?.trim()) continue
    await db
      .insert(matchEvent)
      .values({
        matchId,
        type: "goal",
        detail: "REGULAR",
        player: goal.player.trim(),
        team: goal.team,
        minute: goal.minute,
      })
      .onConflictDoNothing()
  }
}

export async function GET(req: Request) {
  try {
    if (!(await authorize(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    let updated = 0
    let eventsAdded = 0
    let betsSettled = 0

    // Charger les données worldcup26.ir une seule fois (source principale)
    let wc26Games: WC26Game[] = []
    try {
      wc26Games = await fetchGames(process.env.WORLDCUP26_TOKEN)
    } catch (e) {
      console.warn("[sync/live] worldcup26.ir indisponible:", e)
    }

    // -------------------------------------------------------------------------
    // 1) scheduled → live : matchs dont le coup d'envoi est passé
    // -------------------------------------------------------------------------
    const startedMatches = await db
      .select({ id: match.id, kickoff: match.kickoff })
      .from(match)
      .where(and(eq(match.status, "scheduled"), lt(match.kickoff, now)))

    for (const m of startedMatches) {
      await db
        .update(match)
        .set({
          status: "live",
          elapsed: calculateElapsed(m.kickoff),
          lastSyncedAt: now,
        })
        .where(eq(match.id, m.id))
      updated++
    }

    // -------------------------------------------------------------------------
    // 2) live → mise à jour du score en temps réel (worldcup26.ir)
    // -------------------------------------------------------------------------
    const liveMatches = await db
      .select()
      .from(match)
      .where(eq(match.status, "live"))

    for (const m of liveMatches) {
      const wc26 = wc26Games.find(
        (g) =>
          teamsMatch(g.home_team_name_en, m.homeTeam) &&
          teamsMatch(g.away_team_name_en, m.awayTeam),
      )
      if (!wc26) continue

      if (wc26.finished === "TRUE" && wc26.home_score !== "null") {
        // Clôturer le match
        const homeScore = parseInt(wc26.home_score) || 0
        const awayScore = parseInt(wc26.away_score) || 0
        await db
          .update(match)
          .set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: now })
          .where(eq(match.id, m.id))
        updated++

        await insertWC26Goals(m.id, m.homeTeam, m.awayTeam, wc26)

        const summary = await settlePendingBetsForMatch(m.id)
        betsSettled += summary.settled
      } else if (wc26.home_score !== "null" && wc26.home_score !== "") {
        // Score intermédiaire — mise à jour sans clôturer
        const homeScore = parseInt(wc26.home_score) || 0
        const awayScore = parseInt(wc26.away_score) || 0
        const elapsed = wc26.time_elapsed
          ? parseInt(wc26.time_elapsed) || calculateElapsed(m.kickoff)
          : calculateElapsed(m.kickoff)
        await db
          .update(match)
          .set({ homeScore, awayScore, elapsed, lastSyncedAt: now })
          .where(eq(match.id, m.id))
      }
    }

    // -------------------------------------------------------------------------
    // 3) Fallback football-data.org pour les matchs >95min sans résultat wc26
    // -------------------------------------------------------------------------
    const cutoff = new Date(Date.now() - 95 * 60 * 1000)
    const candidates = await db
      .select()
      .from(match)
      .where(and(or(eq(match.status, "scheduled"), eq(match.status, "live")), lt(match.kickoff, cutoff)))

    for (const m of candidates) {
      // Déjà traité par worldcup26 ci-dessus → vérifier s'il est toujours live
      const isStillLive = liveMatches.some((lm) => lm.id === m.id)
      if (isStillLive) {
        // Déjà géré en étape 2
        continue
      }

      // Vérifier worldcup26 d'abord même pour les candidats "scheduled"
      const wc26 = wc26Games.find(
        (g) =>
          g.finished === "TRUE" &&
          g.home_score !== "null" &&
          teamsMatch(g.home_team_name_en, m.homeTeam) &&
          teamsMatch(g.away_team_name_en, m.awayTeam),
      )

      if (wc26) {
        const homeScore = parseInt(wc26.home_score) || 0
        const awayScore = parseInt(wc26.away_score) || 0
        await db
          .update(match)
          .set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: now })
          .where(eq(match.id, m.id))
        updated++

        await insertWC26Goals(m.id, m.homeTeam, m.awayTeam, wc26)

        const summary = await settlePendingBetsForMatch(m.id)
        betsSettled += summary.settled
        continue
      }

      // Dernier recours : football-data.org (nécessite externalId)
      if (!m.externalId) continue

      const detail = await fetchMatchDetail(m.externalId)
      if (!detail) continue

      const isFinished =
        detail.status === "FINISHED" ||
        (detail.score.fullTime.home != null && detail.score.fullTime.away != null)

      if (!isFinished) continue

      const homeScore = detail.score.fullTime.home ?? 0
      const awayScore = detail.score.fullTime.away ?? 0
      await db
        .update(match)
        .set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: now })
        .where(eq(match.id, m.id))
      updated++

      if (detail.goals) {
        for (const g of detail.goals) {
          await db
            .insert(matchEvent)
            .values({
              matchId: m.id,
              type: "goal",
              detail: g.type ?? "REGULAR",
              player: g.scorer?.name ?? null,
              team: g.team?.name ?? "",
              minute: g.minute,
              extraMinute: g.extraTime,
            })
            .onConflictDoNothing()
          eventsAdded++
        }
      }

      const summary = await settlePendingBetsForMatch(m.id)
      betsSettled += summary.settled
    }

    // -------------------------------------------------------------------------
    // 4) Rattrapage : matchs déjà "finished" avec des paris encore "pending"
    // -------------------------------------------------------------------------
    const allFinished = await db
      .select({ id: match.id })
      .from(match)
      .where(eq(match.status, "finished"))

    for (const m of allFinished) {
      const summary = await settlePendingBetsForMatch(m.id)
      betsSettled += summary.settled
    }

    return NextResponse.json({ ok: true, updated, eventsAdded, betsSettled })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
