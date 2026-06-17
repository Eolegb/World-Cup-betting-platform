import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { pushSubscription, match } from "@/lib/db/schema"
import { eq, and, gt, lt } from "drizzle-orm"
import webpush from "web-push"

export const dynamic = "force-dynamic"

// Init web-push with VAPID keys
const vapidPublic = process.env.VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails("mailto:admin@betrod.app", vapidPublic, vapidPrivate)
}

export async function GET() {
  try {
    // Find matches starting in ~25-35 minutes (30 min reminder window)
    const now = new Date()
    const in25min = new Date(now.getTime() + 25 * 60000)
    const in35min = new Date(now.getTime() + 35 * 60000)

    const upcoming = await db
      .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: match.kickoff })
      .from(match)
      .where(and(eq(match.status, "scheduled"), gt(match.kickoff, in25min), lt(match.kickoff, in35min)))

    if (!upcoming.length) return NextResponse.json({ ok: true, sent: 0 })

    // Get all push subscriptions
    const subs = await db.select().from(pushSubscription)
    if (!subs.length) return NextResponse.json({ ok: true, sent: 0, note: "No subscribers" })

    let sent = 0
    for (const match of upcoming) {
      const payload = JSON.stringify({
        title: "⚽ Coup d'envoi dans 30 min !",
        body: `${match.homeTeam} vs ${match.awayTeam} — place tes paris maintenant !`,
        url: `/match/${match.id}`,
        tag: `match-${match.id}`,
      })

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent++
        } catch (e: any) {
          // Remove invalid subscriptions
          if (e.statusCode === 410 || e.statusCode === 404) {
            await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, sub.endpoint))
          }
        }
      }
    }

    return NextResponse.json({ ok: true, sent, matches: upcoming.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
