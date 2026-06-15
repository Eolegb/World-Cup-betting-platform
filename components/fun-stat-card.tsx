"use client"

import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function FunStatCard({ stat }: { stat: string }) {
  return (
    <>
      <style>{`
        @keyframes fun-bounce {
          0% { opacity: 0; transform: scale(0.4) translateY(30px); }
          55% { transform: scale(1.06) translateY(-6px); }
          75% { transform: scale(0.96) translateY(2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .fun-stat-enter { animation: fun-bounce 0.65s ease-out both; }
      `}</style>
      <div
        className={cn(
          "fun-stat-enter",
          "rounded-2xl border border-border bg-card p-4",
          "flex items-start gap-3",
        )}
      >
        <div className="flex shrink-0 items-center justify-center rounded-xl bg-gold/15 p-2">
          <Sparkles className="h-5 w-5 text-gold" />
        </div>
        <p className="text-sm text-card-foreground leading-relaxed">{stat}</p>
      </div>
    </>
  )
}
