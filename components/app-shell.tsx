import { redirect } from "next/navigation"
import { getSession, getOrCreateProfile } from "@/lib/session"
import { getUserCount } from "@/lib/queries"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AppNav } from "@/components/app-nav"
import { runSync } from "@/lib/sync"

/**
 * Loads the current session + profile, redirecting to /sign-in if not authed.
 * Bootstraps the very first registered user as admin.
 */
export async function requireUser() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const p = await getOrCreateProfile(session.user.id, session.user.name || session.user.email)

  // Bootstrap: if this is the only user and not yet admin, promote them.
  if (!p.isAdmin) {
    const count = await getUserCount()
    if (count === 1) {
      await db.update(profile).set({ isAdmin: true }).where(eq(profile.userId, session.user.id))
      p.isAdmin = true
    }
  }

  // Fire-and-forget background sync on first visit after 3+ min idle
  fireBgSync()

  return { user: session.user, profile: { ...p, image: session.user.image ?? null } }
}

let bgSyncRunning = false
let lastBgSync = 0
function fireBgSync() {
  const now = Date.now()
  if (bgSyncRunning || now - lastBgSync < 2 * 60 * 60 * 1000) return // every 2 hours
  lastBgSync = now
  bgSyncRunning = true
  runSync().finally(() => { bgSyncRunning = false })
  // Trigger push in background — fire and forget
  if (typeof window === "undefined") {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
    fetch(`${baseUrl}/api/push/send`).catch(() => {})
  }
}

export async function AppShell({
  profile: p,
  children,
}: {
  profile: { displayName: string; balance: number; isAdmin: boolean; streak?: number; bestStreak?: number; avatarColor?: string; jokerUsedAt?: Date | null; image?: string | null }
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh bg-background">
      <AppNav displayName={p.displayName} balance={p.balance} isAdmin={p.isAdmin} image={p.image} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
