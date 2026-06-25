"use server"

import { setBracketVisibility as setVis, isBracketPublished as isPub } from "@/lib/bracket"
import { revalidatePath } from "next/cache"

export async function toggleBracketVisibility() {
  const current = await isPub()
  await setVis(!current)
  revalidatePath("/bracket")
}
