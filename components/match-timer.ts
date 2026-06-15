"use client"

import { useState, useEffect } from "react"

/**
 * Local match timer - ticks every second, calculates elapsed time from kickoff.
 * Handles halftime break (15 min pause around 45'-60').
 * Much smoother than polling the API for the minute field.
 */
export function useMatchTimer(kickoffISO: string, isLive: boolean): { elapsed: number | null; isHalftime: boolean } {
  const [elapsed, setElapsed] = useState<number | null>(null)

  useEffect(() => {
    if (!isLive) {
      setElapsed(null)
      return
    }

    function tick() {
      const kickoff = new Date(kickoffISO).getTime()
      const now = Date.now()
      if (now < kickoff) {
        setElapsed(null)
        return
      }
      let minutes = Math.floor((now - kickoff) / 60000)
      // Halftime break: cap at 45 until the second half starts
      if (minutes >= 45 && minutes < 60) {
        minutes = 45
      }
      if (minutes > 135) minutes = 90 // extra time done
      setElapsed(Math.min(minutes, 120))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [kickoffISO, isLive])

  const isHalftime = elapsed !== null && elapsed >= 45 && elapsed < 60

  return { elapsed, isHalftime }
}
