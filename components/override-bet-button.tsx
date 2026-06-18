"use client"

import { useState } from "react"
import { overrideBet } from "@/app/actions/override-bet"
import { toast } from "sonner"

const LABELS: Record<string, string> = { won: "✅ Gagné", lost: "❌ Perdu", pending: "⏳ En cours" }
const NEXT: Record<string, string> = { won: "lost", lost: "pending", pending: "won" }

export function OverrideBetButton({ betId, currentStatus }: { betId: number; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = NEXT[status]
    setLoading(true)
    const res = await overrideBet(betId, next as "won" | "lost" | "pending")
    if (res.ok) {
      setStatus(next)
      toast.success(`${LABELS[status]} → ${LABELS[next]}`)
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
      title="Changer le statut"
    >
      {loading ? "..." : "Modifier"}
    </button>
  )
}
