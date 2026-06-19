"use client"

import { useLiveScores } from "@/components/use-live-scores"

/**
 * Renders nothing. Just activates the live score polling from the browser.
 * Put this on any page that should auto-update scores.
 */
export function LiveScorePoller() {
  useLiveScores(45)
  return null
}
