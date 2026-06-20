"use client"

import { useState, useRef, useEffect } from "react"
import { overrideBet } from "@/app/actions/override-bet"
import { toast } from "sonner"

const OPTIONS = [
  { value: "won", label: "Gagné", emoji: "✅" },
  { value: "lost", label: "Perdu", emoji: "❌" },
  { value: "pending", label: "En cours", emoji: "⏳" },
]

export function OverrideBetButton({ betId, currentStatus }: { betId: number; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])

  async function pick(status: string) {
    setOpen(false)
    if (status === currentStatus) return
    setLoading(true)
    const res = await overrideBet(betId, status as "won" | "lost" | "pending")
    if (res.ok) {
      toast.success(`${OPTIONS.find(o => o.value === status)?.label} !`)
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Modifier"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-[100] rounded-lg border border-border bg-popover shadow-xl py-1 min-w-[110px]">
          {OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => pick(o.value)}
              className={`block w-full text-left px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary ${
                o.value === currentStatus ? "text-primary font-medium" : "text-foreground"
              }`}
            >
              {o.emoji} {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
