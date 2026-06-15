import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match } from "@/lib/db/schema"
import { fetchLiveFixtures, type FootballDataMatch } from "@/lib/providers"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const fixtures = await fetchLiveFixtures()
    let updated = 0

    for (const f of fixtures) {
      if (f.status !== "LIVE" && f.status !== "IN_PLAY" && f.status !== "PAUSED") continue

      const status = f.status === "FINISHED" ? "finished" : "live"
      const kickoff = new Date(f.utcDate)
      const elapsed = Math.max(0, Math.floor((Date.now() - kickoff.getTime()) / 60000))

      await db
        .update(match)
        .set({
          status,
          elapsed: Math.min(elapsed, 120),
          homeScore: f.score.fullTime.home ?? 0,
          awayScore: f.score.fullTime.away ?? 0,
          lastSyncedAt: new Date(),
        })
        .where(eq(match.externalId, f.id))

      updated++
    }

    // Also check for finished matches that might have ended
    const allFixtures = await (await import("@/lib/providers")).fetchFixtures()
    for (const f of allFixtures) {
      if (f.status === "FINISHED") {
        const [existing] = await db.select({ status: match.status }).from(match).where(eq(match.externalId, f.id)).limit(1)
        if (existing && existing.status !== "finished") {
          await db
            .update(match)
            .set({
              status: "finished",
              homeScore: f.score.fullTime.home ?? 0,
              awayScore: f.score.fullTime.away ?? 0,
              lastSyncedAt: new Date(),
            })
            .where(eq(match.externalId, f.id))
          updated++
        }
      }
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
