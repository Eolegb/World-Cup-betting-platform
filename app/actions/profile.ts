"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateAvatar(base64: string) {
  const userId = await getUserId()
  if (!base64.startsWith("data:image/")) return { ok: false as const, error: "Format invalide" }
  await db.update(user).set({ image: base64 }).where(eq(user.id, userId))
  revalidatePath("/")
  return { ok: true as const }
}
