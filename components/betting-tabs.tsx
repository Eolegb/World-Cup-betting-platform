"use client"

import { useState } from "react"
import { BettingInterface } from "@/components/betting-interface"
import { BettingCombined } from "@/components/betting-combined"
import { cn } from "@/lib/utils"

export function BettingTabs({ matchId, markets, balance, homeTeam, awayTeam }: { matchId: number; markets: any[]; balance: number; homeTeam: string; awayTeam: string }) {
  const [tab, setTab] = useState<"simple" | "combined">("simple")

  return (
    <div>
      <div className="mb-4 flex gap-1">
        <button
          onClick={() => setTab("simple")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "simple" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          Paris simple
        </button>
        <button
          onClick={() => setTab("combined")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "combined" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          Combiné x2-x5
        </button>
      </div>

      {tab === "simple" ? (
        <BettingInterface matchId={matchId} markets={markets} balance={balance} canBet={true} homeTeam={homeTeam} awayTeam={awayTeam} />
      ) : (
        <BettingCombined balance={balance} />
      )}
    </div>
  )
}
