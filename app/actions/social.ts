"use server"

import { db } from "@/lib/db"
import { activityFeed, betReaction, chatMessage, profile, user } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { and, asc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function postActivity(
  type: string,
  message: string,
  matchId?: number | null,
  betId?: number | null,
  metadata?: Record<string, unknown> | null,
) {
  const userId = await getUserId()
  await db.insert(activityFeed).values({
    userId,
    type,
    message,
    matchId: matchId ?? null,
    betId: betId ?? null,
    metadata: metadata ?? null,
  })
  revalidatePath("/")
}

export async function addReaction(betId: number, emoji: string) {
  const userId = await getUserId()
  const existing = await db
    .select()
    .from(betReaction)
    .where(
      and(
        eq(betReaction.betId, betId),
        eq(betReaction.userId, userId),
        eq(betReaction.emoji, emoji),
      ),
    )
    .limit(1)

  if (existing.length) {
    await db
      .delete(betReaction)
      .where(
        and(
          eq(betReaction.betId, betId),
          eq(betReaction.userId, userId),
          eq(betReaction.emoji, emoji),
        ),
      )
  } else {
    await db.insert(betReaction).values({ betId, userId, emoji })
  }

  revalidatePath("/")
  revalidatePath("/mes-paris")
  return { ok: true as const }
}

export async function getReactions(betId: number) {
  const rows = await db
    .select({
      emoji: betReaction.emoji,
      count: sql<number>`count(*)::int`,
    })
    .from(betReaction)
    .where(eq(betReaction.betId, betId))
    .groupBy(betReaction.emoji)

  return rows.map((r) => ({ emoji: r.emoji, count: r.count }))
}

export async function getUserReactions(betId: number) {
  const userId = await getUserId()
  const rows = await db
    .select({ emoji: betReaction.emoji })
    .from(betReaction)
    .where(
      and(eq(betReaction.betId, betId), eq(betReaction.userId, userId)),
    )

  return rows.map((r) => r.emoji)
}

export async function sendChatMessage(matchId: number, message: string) {
  const userId = await getUserId()
  const trimmed = message.trim()
  if (!trimmed) return { ok: false as const, error: "Message vide." }
  if (trimmed.length > 500) return { ok: false as const, error: "Message trop long (max 500)." }

  await db.insert(chatMessage).values({
    matchId,
    userId,
    message: trimmed,
  })

  revalidatePath(`/match/${matchId}`)
  return { ok: true as const }
}

export type ChatMessageRow = {
  id: number
  matchId: number
  userId: string
  message: string
  createdAt: Date
  displayName: string
  avatarColor: string
  image: string | null
}

export async function getChatMessages(matchId: number): Promise<ChatMessageRow[]> {
  const rows = await db
    .select({
      id: chatMessage.id,
      matchId: chatMessage.matchId,
      userId: chatMessage.userId,
      message: chatMessage.message,
      createdAt: chatMessage.createdAt,
      displayName: profile.displayName,
      avatarColor: profile.avatarColor,
      image: user.image,
    })
    .from(chatMessage)
    .innerJoin(profile, eq(chatMessage.userId, profile.userId))
    .innerJoin(user, eq(chatMessage.userId, user.id))
    .where(eq(chatMessage.matchId, matchId))
    .orderBy(asc(chatMessage.createdAt))
    .limit(50)

  return rows
}
