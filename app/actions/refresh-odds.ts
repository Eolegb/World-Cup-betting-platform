"use server"

import { requireUser } from "@/components/app-shell"
import { fetchAndStoreOddsForMatch } from "@/lib/therundown-service"
import { revalidatePath } from "next/cache"

export async function refreshMatchOdds(homeTeam: string, awayTeam: string, kickoff: string) {
  const { profile } = await requireUser()
  if (!profile.isAdmin) return { ok: false as const, error: "Admin only", errorCode: "FORBIDDEN" }

  const result = await fetchAndStoreOddsForMatch(homeTeam, awayTeam, new Date(kickoff))
  if (result.ok) {
    revalidatePath("/match/[id]", "page")
  }
  return result
}
