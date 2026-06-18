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
        toast.success(res.status === "won" ? `✅ Gagné ! +${res.payout}€` : "❌ Perdu.")
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
      className="rounded-lg border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 shrink-0"
      title="Clôturer ce pari"
    >
      {loading ? "..." : "Clôturer"}
    </button>
  )
}
