"use client"

import { BettingInterface } from "@/components/betting-interface"

export function BettingTabs({ matchId, markets, balance }: { matchId: number; markets: any[]; balance: number }) {
  return (
    <BettingInterface matchId={matchId} markets={markets} balance={balance} canBet={true} />
  )
}
