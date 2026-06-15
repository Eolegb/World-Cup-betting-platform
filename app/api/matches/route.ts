import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { match, profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await db
    .select({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeTeamCode: match.homeTeamCode,
      awayTeamCode: match.awayTeamCode,
      kickoff: match.kickoff,
      stage: match.stage,
    })
    .from(match)
    .where(eq(match.status, "scheduled"))
    .orderBy(match.kickoff)

  return NextResponse.json(rows)
}
