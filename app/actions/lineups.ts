"use server"

import { fetchLineups } from "@/lib/providers"
import type { TeamLineup } from "@/lib/providers"

export async function getMatchLineups(homeTeam: string, awayTeam: string, date?: string): Promise<{
  home: (TeamLineup & { color?: string }) | null
  away: (TeamLineup & { color?: string }) | null
}> {
  const lineups = await fetchLineups(homeTeam, awayTeam, date)
  if (!lineups) return { home: null, away: null }

  const teamColors = await import("@/lib/team-colors")
  const homeColors = teamColors.teamColors(homeTeam)
  const awayColors = teamColors.teamColors(awayTeam)

  return {
    home: lineups.home ? { ...lineups.home, color: homeColors.primary } : null,
    away: lineups.away ? { ...lineups.away, color: awayColors.primary } : null,
  }
}
