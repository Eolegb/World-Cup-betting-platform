import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function checkCronAuth(req: Request): string | null {
  const expected = process.env.CRON_SECRET ?? "cron-secret-change-me"
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${expected}`) return expected

  try {
    const url = new URL(req.url)
    if (url.searchParams.get("secret") === expected) return expected
  } catch {
    // ignore
  }

  return null
}

export async function GET(req: Request) {
  const secret = checkCronAuth(req)
  if (!secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const origin = new URL(req.url).origin
  const [liveRes, pushRes, oddsRes] = await Promise.all([
    fetch(`${origin}/api/sync/live?secret=${encodeURIComponent(secret)}`),
    fetch(`${origin}/api/push/send?secret=${encodeURIComponent(secret)}`),
    fetch(`${origin}/api/cron/update-odds?secret=${encodeURIComponent(secret)}`),
  ])

  const [liveData, pushData, oddsData] = await Promise.all([
    liveRes.json(),
    pushRes.json(),
    oddsRes.json(),
  ])
  return NextResponse.json({ ok: true, live: liveData, push: pushData, odds: oddsData })
}
