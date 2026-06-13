"use server"

import { requireAdmin } from "@/lib/session"
import { runSync } from "@/lib/sync"
import { revalidatePath } from "next/cache"

export async function triggerSync() {
  await requireAdmin()
  const data = await runSync()
  revalidatePath("/")
  revalidatePath("/admin")
  return data
}
