"use client"

import { useState, useEffect, useRef } from "react"

export function useScrollHide(threshold = 10) {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const current = window.scrollY
          if (current > lastScrollY.current + threshold) setHidden(true)
          else if (current < lastScrollY.current - threshold) setHidden(false)
          lastScrollY.current = current
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  return hidden
}
