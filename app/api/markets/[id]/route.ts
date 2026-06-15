import { NextResponse } from "next/server"
import { getMatch, marketsForMatch } from "@/lib/queries"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const matchId = Number.parseInt(id, 10)
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 })
  }

  const m = await getMatch(matchId)
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const markets = marketsForMatch(m)
  return NextResponse.json({ matchId, markets })
}
