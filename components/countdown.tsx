"use client"

import { useState, useEffect } from "react"
import { utcDate } from "@/lib/datetime"

export function Countdown({ kickoff }: { kickoff: string | Date }) {
  const [label, setLabel] = useState("...")

  useEffect(() => {
    function tick() {
      const target = utcDate(kickoff).getTime()
      if (isNaN(target)) { setLabel("..."); return }
      const diff = target - Date.now()
      if (diff <= 0) { setLabel("C'est parti !"); return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      if (days > 0) setLabel(`${days}j ${hours}h ${mins}min`)
      else if (hours > 0) setLabel(`${hours}h ${mins}min ${secs}s`)
      else setLabel(`${mins}min ${secs}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [kickoff])

  return <span className="text-xs text-muted-foreground tabular">{label}</span>
}
