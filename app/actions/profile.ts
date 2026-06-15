"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateProfileImage(imageUrl: string) {
  const userId = await getUserId()
  const trimmed = imageUrl.trim()

  if (!trimmed) {
    await db.update(user).set({ image: null }).where(eq(user.id, userId))
    revalidatePath("/")
    revalidatePath("/settings")
    return { ok: true as const }
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { ok: false as const, error: "L'URL doit commencer par http:// ou https://" }
  }

  await db.update(user).set({ image: trimmed }).where(eq(user.id, userId))
  revalidatePath("/")
  revalidatePath("/settings")
  return { ok: true as const }
}

export async function updateDisplayName(name: string) {
  const userId = await getUserId()
  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2) {
    return { ok: false as const, error: "Le pseudo doit faire au moins 2 caractères." }
  }
  if (trimmed.length > 30) {
    return { ok: false as const, error: "Le pseudo ne peut pas dépasser 30 caractères." }
  }

  await db.update(user).set({ name: trimmed }).where(eq(user.id, userId))
  revalidatePath("/")
  revalidatePath("/settings")
  revalidatePath("/classement")
  return { ok: true as const }
}
