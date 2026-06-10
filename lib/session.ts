import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function getUserId() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

/** Returns the profile row, creating it on first access (balance starts 1000). */
export async function getOrCreateProfile(userId: string, displayName: string) {
  const existing = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1)
  if (existing.length) return existing[0]
  const [created] = await db
    .insert(profile)
    .values({ userId, displayName })
    .onConflictDoNothing()
    .returning()
  if (created) return created
  const reread = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1)
  return reread[0]
}

export async function requireAdmin() {
  const userId = await getUserId()
  const rows = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1)
  if (!rows.length || !rows[0].isAdmin) throw new Error("Forbidden: admin only")
  return userId
}
