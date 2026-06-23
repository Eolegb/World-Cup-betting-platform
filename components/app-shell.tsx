import { redirect } from "next/navigation"
import { getSession, getOrCreateProfile } from "@/lib/session"
import { getUserCount } from "@/lib/queries"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AppNav } from "@/components/app-nav"
import { LiveScorePoller } from "@/components/live-score-poller"
import { PushReminderPoller } from "@/components/push-reminder-poller"

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

  return { user: session.user, profile: { ...p, image: session.user.image ?? null } }
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
      <LiveScorePoller />
      <PushReminderPoller />
      <main className="mx-auto max-w-5xl px-4 py-6 overflow-x-hidden w-full min-w-0">{children}</main>
    </div>
  )
}
