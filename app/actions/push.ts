"use server"

import { db } from "@/lib/db"
import { pushSubscription } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function subscribeToPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const userId = await getUserId()
  await db
    .insert(pushSubscription)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoNothing()
  revalidatePath("/")
  return { ok: true as const }
}

export async function unsubscribeFromPush(endpoint: string) {
  const userId = await getUserId()
  await db.delete(pushSubscription).where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)))
  revalidatePath("/")
  return { ok: true as const }
}
