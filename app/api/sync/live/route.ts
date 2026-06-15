import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import { fetchLiveFixtures, fetchMatchDetail } from "@/lib/providers"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Clear the fixture cache to force fresh data
    const fixtures = await fetchLiveFixtures()
    let updated = 0

    for (const f of fixtures) {
      const extId = f.id
      const status = f.status === "FINISHED" ? "finished" : "live"
      const homeScore = f.score.fullTime.home ?? 0
      const awayScore = f.score.fullTime.away ?? 0

      // Find internal match ID
      const [existing] = await db
        .select({ id: match.id })
        .from(match)
        .where(eq(match.externalId, extId))
        .limit(1)

      if (!existing) continue

      let elapsed: number | null = null
      let goals: any[] = []

      if (status === "live") {
        const detail = await fetchMatchDetail(extId)
        if (detail) {
          elapsed = detail.minute ?? calculateMinute(detail.utcDate)
          goals = detail.goals ?? []
        } else {
          elapsed = calculateMinute(f.utcDate)
        }
      }

      await db
        .update(match)
        .set({ status, elapsed, homeScore, awayScore, lastSyncedAt: new Date() })
        .where(eq(match.id, existing.id))
      updated++

      // Sync goal events
      for (const g of goals) {
        await db
          .insert(matchEvent)
          .values({
            matchId: existing.id,
            type: "goal",
            detail: g.type ?? "REGULAR",
            player: g.scorer?.name ?? null,
            team: g.team?.name ?? "",
            minute: g.minute,
            extraMinute: g.extraTime,
          })
          .onConflictDoNothing()
      }
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

function calculateMinute(utcDate: string): number | null {
  const kickoff = new Date(utcDate).getTime()
  const now = Date.now()
  if (now < kickoff) return null
  const minutes = Math.floor((now - kickoff) / 60000)
  if (minutes > 135) return 90 // extra time ended
  return Math.min(minutes, 120)
}
