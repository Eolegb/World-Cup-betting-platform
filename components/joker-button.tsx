"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useJoker, canUseJoker } from "@/app/actions/bets"
import { Sparkles, Clock } from "lucide-react"

interface JokerButtonProps {
  betId: number
  jokerUsedAt: Date | null
}

function timeUntil(d: Date): string {
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return "disponible"
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `dans ${days}j ${hours}h`
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `dans ${hours}h ${minutes}min`
  return `dans ${minutes}min`
}

export function JokerButton({ betId, jokerUsedAt }: JokerButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null)
  const [serverResetAt, setServerResetAt] = useState<Date | null>(null)

  useEffect(() => {
    canUseJoker().then((res) => {
      setServerAvailable(res.available)
      setServerResetAt(res.resetAt)
    })
  }, [jokerUsedAt])

  const resetAt = serverResetAt ?? (jokerUsedAt ? new Date(jokerUsedAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null)
  const available = serverAvailable ?? (jokerUsedAt ? new Date().getTime() - jokerUsedAt.getTime() >= 7 * 24 * 60 * 60 * 1000 : true)
  const resetLabel = resetAt && !available ? timeUntil(resetAt) : null

  async function handleUse() {
    setLoading(true)
    const res = await useJoker(betId)
    setLoading(false)
    if (res.ok) {
      toast.success("Joker activé ! Payout potentiel doublé.")
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  if (!available) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-3 py-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Joker déjà utilisé. Prochain{" "}
          {resetLabel ?? "bientôt"}
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleUse}
      className={cn(
        "group relative isolate inline-flex items-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] disabled:opacity-60",
        "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 bg-[length:200%_100%] hover:bg-right",
      )}
      style={{ transitionDuration: "300ms" }}
    >
      {/* Sparkle overlay */}
      <span
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 40%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.6) 0%, transparent 50%)",
        }}
      />
      <span className="absolute inset-0 animate-pulse rounded-xl bg-white/10" />
      <Sparkles className="relative h-4 w-4" />
      <span className="relative drop-shadow-sm">Joker x2</span>
    </button>
  )
}
