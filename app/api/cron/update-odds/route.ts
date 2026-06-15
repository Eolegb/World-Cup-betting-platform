import { NextResponse } from "next/server"
import { updateAllOdds } from "@/lib/odds-service"
import { runSync } from "@/lib/sync"

export const dynamic = "force-dynamic"

function checkCronAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "cron-secret-change-me"
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${expected}`) return true
  try { const url = new URL(req.url); if (url.searchParams.get("secret") === expected) return true } catch {}
  return false
}

export async function GET(req: Request) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  console.log("[cron] update-odds: Starting full odds update...")
  const oddsResult = await updateAllOdds()
  console.log("[cron] update-odds: Odds update complete, running full sync...")
  const syncResult = await runSync()
  console.log("[cron] update-odds: Full sync complete")

  return NextResponse.json({ odds: oddsResult, sync: syncResult })
}
