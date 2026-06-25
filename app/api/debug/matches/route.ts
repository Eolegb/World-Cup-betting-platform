import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match } from "@/lib/db/schema"
import { eq, desc, count } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const all = await db.select().from(match).orderBy(match.kickoff)

    const scheduled = all.filter((m) => m.status === "scheduled")
    const live = all.filter((m) => m.status === "live")
    const finished = all.filter((m) => m.status === "finished")

    return NextResponse.json({
      ok: true,
      total: all.length,
      counts: {
        scheduled: scheduled.length,
        live: live.length,
        finished: finished.length,
      },
      upcoming: scheduled.slice(0, 20).map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        kickoff: m.kickoff,
        stage: m.stage,
        venue: m.venue,
        status: m.status,
        externalId: m.externalId,
      })),
      recent_live: live.slice(0, 5).map((m) => ({ id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, status: m.status })),
      recent_finished: finished.slice(-5).map((m) => ({ id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, status: m.status })),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
