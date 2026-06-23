"use client"

import { useState } from "react"
import { settleSingleBet } from "@/app/actions/settle-bet"
import { toast } from "sonner"

export function SettleBetButton({ betId }: { betId: number }) {
  const [loading, setLoading] = useState(false)

  async function handleSettle() {
    setLoading(true)
    try {
      const res = await settleSingleBet(betId)
      if (res.ok) {
        toast.success(res.status === "won" ? `Gagné ! +${res.payout}€` : "Perdu.")
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error("Erreur réseau")
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleSettle}
      disabled={loading}
      className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 shrink-0"
      title="Clôturer ce pari"
    >
      {loading ? "..." : "Clôturer"}
    </button>
  )
}
