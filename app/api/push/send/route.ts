import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { pushSubscription, match, profile, user } from "@/lib/db/schema"
import { eq, and, gt, lt } from "drizzle-orm"
import webpush from "web-push"
import { pickNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

const vapidPublic = process.env.VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails("mailto:admin@betrod.app", vapidPublic, vapidPrivate)
}

export async function GET() {
  try {
    const now = new Date()

    // 1. REMINDERS: matches in ~25-35 minutes → "Dernier appel"
    const in25min = new Date(now.getTime() + 25 * 60000)
    const in35min = new Date(now.getTime() + 35 * 60000)
    const upcoming = await db
      .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: match.kickoff })
      .from(match)
      .where(and(eq(match.status, "scheduled"), gt(match.kickoff, in25min), lt(match.kickoff, in35min)))
      .limit(3)

    // 2. HYPE: random upcoming match → "Tu devrais parier..."
    const hypeMatches = await db
      .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: match.kickoff })
      .from(match)
      .where(and(eq(match.status, "scheduled"), gt(match.kickoff, now)))
      .limit(10)

    const allMatches = [...upcoming]
    if (upcoming.length < 3 && hypeMatches.length > 0) {
      // Add 2 random hype matches
      for (let i = 0; i < 2 && hypeMatches.length > 0; i++) {
        const idx = Math.floor(Math.random() * hypeMatches.length)
        const m = hypeMatches.splice(idx, 1)[0]
        if (!allMatches.find(x => x.id === m.id)) allMatches.push(m)
      }
    }

    if (!allMatches.length) return NextResponse.json({ ok: true, sent: 0 })

    const subs = await db.select({ endpoint: pushSubscription.endpoint, p256dh: pushSubscription.p256dh, auth: pushSubscription.auth, userId: pushSubscription.userId }).from(pushSubscription)
    if (!subs.length) return NextResponse.json({ ok: true, sent: 0, note: "No subscribers" })

    const users = await db.select({ id: user.id, name: user.name }).from(user)
    const userMap = new Map(users.map(u => [u.id, u.name ?? "joueur"]))

    let sent = 0
    for (const m of allMatches) {
      for (const sub of subs) {
        const userName = userMap.get(sub.userId) ?? "joueur"
        const notification = pickNotification(userName, m.homeTeam, m.awayTeam, `/match/${m.id}`)
        if (!notification) continue

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(notification)
          )
          sent++
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, sub.endpoint))
          }
        }
      }
    }

    return NextResponse.json({ ok: true, sent, matches: allMatches.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
