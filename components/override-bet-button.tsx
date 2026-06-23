"use client"

import { useState, useRef, useEffect } from "react"
import { overrideBet } from "@/app/actions/override-bet"
import { toast } from "sonner"
import { ChevronDown } from "lucide-react"

const OPTIONS = [
  { value: "won", label: "Gagné", color: "text-primary" },
  { value: "lost", label: "Perdu", color: "text-destructive" },
  { value: "pending", label: "En cours", color: "text-yellow-400" },
]

export function OverrideBetButton({ betId, currentStatus }: { betId: number; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  async function pick(status: string) {
    setOpen(false)
    if (status === currentStatus) return
    setLoading(true)
    const res = await overrideBet(betId, status as "won" | "lost" | "pending")
    if (res.ok) {
      toast.success(OPTIONS.find(o => o.value === status)?.label + " !")
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  const current = OPTIONS.find(o => o.value === currentStatus)

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
      >
        <span className={current?.color}>{loading ? "..." : current?.label ?? "Modifier"}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-[200] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden min-w-[140px]">
          {OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => pick(o.value)}
              className={`block w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary ${
                o.value === currentStatus ? "bg-secondary/50" : ""
              } ${o.color}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
