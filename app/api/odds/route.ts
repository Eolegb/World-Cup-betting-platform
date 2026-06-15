import { NextResponse } from "next/server"
import { getAllOdds } from "@/lib/odds-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const odds = await getAllOdds()
  const result: Record<string, unknown> = {}
  for (const [id, data] of odds) {
    result[String(id)] = data
  }
  return NextResponse.json(result)
}
