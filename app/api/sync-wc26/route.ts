import { NextResponse } from "next/server"
import { syncWC26Fixtures } from "@/lib/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: Request) {
  const expected = process.env.SYNC_SECRET ?? "sync-secret-change-me"
  const url = new URL(req.url)
  const secretParam = url.searchParams.get("secret")

  if (secretParam !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncWC26Fixtures()
  return NextResponse.json(result, result.ok ? { status: 200 } : { status: 500 })
}

export async function POST(req: Request) {
  const expected = process.env.SYNC_SECRET ?? "sync-secret-change-me"
  const authHeader = req.headers.get("authorization")

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncWC26Fixtures()
  return NextResponse.json(result, result.ok ? { status: 200 } : { status: 500 })
}
