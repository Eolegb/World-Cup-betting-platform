"use client"

import { useState, useEffect } from "react"
import { utcDate } from "@/lib/datetime"

export function useMatchTimer(kickoffISO: string | Date, isLive: boolean): { elapsed: number | null; isHalftime: boolean } {
  const [elapsed, setElapsed] = useState<number | null>(null)

  useEffect(() => {
    if (!isLive) { setElapsed(null); return }

    function tick() {
      const kickoff = utcDate(kickoffISO).getTime()
      const now = Date.now()
      if (now < kickoff) { setElapsed(null); return }
      let minutes = Math.floor((now - kickoff) / 60000)
      if (minutes >= 45 && minutes < 60) minutes = 45
      if (minutes > 135) minutes = 90
      setElapsed(Math.min(minutes, 120))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [kickoffISO, isLive])

  const isHalftime = elapsed !== null && elapsed >= 45 && elapsed < 60
  return { elapsed, isHalftime }
}
