"use client"

import { BettingInterface } from "@/components/betting-interface"

export function BettingTabs({ matchId, markets, balance, homeTeam, awayTeam }: { matchId: number; markets: any[]; balance: number; homeTeam: string; awayTeam: string }) {
  return (
    <BettingInterface matchId={matchId} markets={markets} balance={balance} canBet={true} homeTeam={homeTeam} awayTeam={awayTeam} />
  )
}
