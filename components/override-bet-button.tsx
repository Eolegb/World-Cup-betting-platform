"use client"

import { useState } from "react"
import { overrideBet } from "@/app/actions/override-bet"
import { toast } from "sonner"

const OPTIONS = [
  { value: "won", label: "✅ Gagné" },
  { value: "lost", label: "❌ Perdu" },
  { value: "pending", label: "⏳ En cours" },
]

export function OverrideBetButton({ betId, currentStatus }: { betId: number; currentStatus: string }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  async function handleChange(newStatus: string) {
    if (newStatus === status || loading) return
    setLoading(true)
    const res = await overrideBet(betId, newStatus as "won" | "lost" | "pending")
    if (res.ok) {
      setStatus(newStatus)
      toast.success(OPTIONS.find(o => o.value === newStatus)?.label + " !")
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  return (
    <select
      value={status}
      disabled={loading}
      onChange={e => handleChange(e.target.value)}
      className="appearance-none rounded-lg border border-border bg-card px-3 py-2 pr-8 text-sm font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50 cursor-pointer"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "14px" }}
    >
      {OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
