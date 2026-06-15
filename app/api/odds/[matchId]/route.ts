import { NextResponse } from "next/server"
import { getOddsForMatch } from "@/lib/odds-service"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const id = Number.parseInt(matchId, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

  const odds = await getOddsForMatch(id)
  return NextResponse.json(odds)
}
