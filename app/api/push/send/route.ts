import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activityFeed, match, profile, pushSubscription } from "@/lib/db/schema"
import { eq, and, gt, lt, inArray } from "drizzle-orm"
import webpush from "web-push"
import { pickNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

const vapidPublic = process.env.VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails("mailto:admin@betrod.app", vapidPublic, vapidPrivate)
}

function isCronRequest(req: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "cron-secret-change-me"
  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${expected}`) return true

  const url = new URL(req.url)
  return url.searchParams.get("secret") === expected
}

type MatchRow = {
  id: number
  homeTeam: string
  awayTeam: string
  kickoff: Date
}

async function loadMatches(): Promise<MatchRow[]> {
  const now = new Date()
  const in25min = new Date(now.getTime() + 25 * 60 * 1000)
  const in35min = new Date(now.getTime() + 35 * 60 * 1000)

  const upcoming = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: match.kickoff })
    .from(match)
    .where(and(eq(match.status, "scheduled"), gt(match.kickoff, in25min), lt(match.kickoff, in35min)))
    .orderBy(match.kickoff)
    .limit(3)

  const hypeMatches = await db
    .select({ id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: match.kickoff })
    .from(match)
    .where(and(eq(match.status, "scheduled"), gt(match.kickoff, now)))
    .orderBy(match.kickoff)
    .limit(10)

  const allMatches = [...upcoming]
  if (upcoming.length < 3 && hypeMatches.length > 0) {
    const pool = [...hypeMatches]
    for (let i = 0; i < 2 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      const picked = pool.splice(idx, 1)[0]
      if (!allMatches.find((x) => x.id === picked.id)) allMatches.push(picked)
    }
  }

  return allMatches
}

async function loadTargetUsers(cronMode: boolean): Promise<{ userId: string; displayName: string }[]> {
  if (!cronMode) {
    // Browser poller: send to all subscribed users (not just current user)
    return db.select({ userId: profile.userId, displayName: profile.displayName }).from(profile)
  }
  return db.select({ userId: profile.userId, displayName: profile.displayName }).from(profile)
}

async function hasReminderBeenSent(userId: string, matchId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: activityFeed.id })
    .from(activityFeed)
    .where(and(eq(activityFeed.userId, userId), eq(activityFeed.type, "push_reminder"), eq(activityFeed.matchId, matchId)))
    .limit(1)
  return !!row
}

async function markReminderSent(userId: string, matchId: number, message: string, metadata: Record<string, unknown>) {
  await db.insert(activityFeed).values({
    userId,
    type: "push_reminder",
    message,
    matchId,
    metadata,
  })
}

export async function GET(req: Request) {
  try {
    const cronMode = isCronRequest(req)
    const targetUsers = await loadTargetUsers(cronMode)
    if (targetUsers.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, note: "No target users" })
    }

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ ok: true, sent: 0, note: "Missing VAPID keys" })
    }

    const matches = await loadMatches()
    if (!matches.length) return NextResponse.json({ ok: true, sent: 0, matches: 0 })

    const userIds = targetUsers.map((u) => u.userId)
    const subs = await db
      .select({
        endpoint: pushSubscription.endpoint,
        p256dh: pushSubscription.p256dh,
        auth: pushSubscription.auth,
        userId: pushSubscription.userId,
      })
      .from(pushSubscription)
      .where(inArray(pushSubscription.userId, userIds))

    if (!subs.length) return NextResponse.json({ ok: true, sent: 0, note: "No subscribers" })

    const displayNameByUserId = new Map(targetUsers.map((u) => [u.userId, u.displayName]))
    const subsByUserId = new Map<string, typeof subs>()
    for (const sub of subs) {
      const current = subsByUserId.get(sub.userId) ?? []
      current.push(sub)
      subsByUserId.set(sub.userId, current)
    }

    let sent = 0

    for (const m of matches) {
      for (const target of targetUsers) {
        if (await hasReminderBeenSent(target.userId, m.id)) continue

        const userSubs = subsByUserId.get(target.userId) ?? []
        if (!userSubs.length) continue

        const userName = displayNameByUserId.get(target.userId) ?? "joueur"
        const notification = pickNotification(userName, m.homeTeam, m.awayTeam, `/match/${m.id}`)
        if (!notification) continue

        let delivered = 0
        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify(notification),
            )
            delivered++
            sent++
          } catch (e: any) {
            if (e.statusCode === 410 || e.statusCode === 404) {
              await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, sub.endpoint))
            }
          }
        }

        if (delivered > 0) {
          await markReminderSent(target.userId, m.id, notification.body, {
            title: notification.title,
            url: notification.url,
            tag: notification.tag,
            source: cronMode ? "cron" : "browser",
          })
        }
      }
    }

    return NextResponse.json({ ok: true, sent, matches: matches.length, cron: cronMode })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
