import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import { fetchMatchDetail } from "@/lib/providers"
import { settlePendingBetsForMatch } from "@/lib/settle-match"
import { getUserId } from "@/lib/session"
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

export async function GET(req: Request) {
  try {
    if (!(await authorize(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    let updated = 0
    let eventsAdded = 0
    let betsSettled = 0

    // 1) Mark matches that have started as live so bets close immediately.
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

    // 2) Finish matches that have likely ended.
    const cutoff = new Date(Date.now() - 95 * 60 * 1000)
    const candidates = await db
      .select()
      .from(match)
      .where(and(or(eq(match.status, "scheduled"), eq(match.status, "live")), lt(match.kickoff, cutoff)))

    for (const m of candidates) {
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
        .set({
          status: "finished",
          homeScore,
          awayScore,
          elapsed: 90,
          lastSyncedAt: now,
        })
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

    // 3) Catch up any finished matches that still have pending bets.
    const allFinished = await db.select({ id: match.id }).from(match).where(eq(match.status, "finished"))
    for (const m of allFinished) {
      const summary = await settlePendingBetsForMatch(m.id)
      betsSettled += summary.settled
    }

    return NextResponse.json({ ok: true, updated, eventsAdded, betsSettled })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
