import { NextResponse } from "next/server"
import { runSync } from "@/lib/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: Request) {
  const expected = process.env.SYNC_SECRET ?? "sync-secret-change-me"

  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${expected}`) {
    const data = await runSync()
    return NextResponse.json(data, data.ok ? { status: 200 } : { status: 500 })
  }

  const url = new URL(req.url)
  const secretParam = url.searchParams.get("secret")
  if (secretParam === expected) {
    const data = await runSync()
    return NextResponse.json(data, data.ok ? { status: 200 } : { status: 500 })
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET(req: Request) {
  const expected = process.env.SYNC_SECRET ?? "sync-secret-change-me"
  const url = new URL(req.url)
  const secretParam = url.searchParams.get("secret")

  if (secretParam !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await runSync()
  return NextResponse.json(data, data.ok ? { status: 200 } : { status: 500 })
}
