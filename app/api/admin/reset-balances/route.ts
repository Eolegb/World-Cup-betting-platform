import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await db.select({ userId: profile.userId, balanceBackup: profile.balanceBackup }).from(profile)
  let restored = 0
  for (const r of rows) {
    await db.update(profile).set({ balance: r.balanceBackup }).where(eq(profile.userId, r.userId))
    restored++
  }
  return NextResponse.json({ ok: true, restored })
}
