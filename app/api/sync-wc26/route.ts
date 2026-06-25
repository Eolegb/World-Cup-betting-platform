import { NextResponse } from "next/server"
import { syncWC26Fixtures } from "@/lib/sync"
import { getUserId } from "@/lib/session"

export const dynamic = "force-dynamic"
export const maxDuration = 60

async function authorize(req: Request): Promise<boolean> {
  // Session-based auth (admin user)
  try {
    await getUserId()
    return true
  } catch {
    // Fallback to secret-based auth
    const expected = process.env.SYNC_SECRET ?? "sync-secret-change-me"
    const authHeader = req.headers.get("authorization")
    if (authHeader === `Bearer ${expected}`) return true
    try {
      const url = new URL(req.url)
      if (url.searchParams.get("secret") === expected) return true
    } catch { /* ignore */ }
    return false
  }
}

export async function GET(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await syncWC26Fixtures()
  return NextResponse.json(result, result.ok ? { status: 200 } : { status: 500 })
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await syncWC26Fixtures()
  return NextResponse.json(result, result.ok ? { status: 200 } : { status: 500 })
}
