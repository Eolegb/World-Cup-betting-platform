"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope)
        })
        .catch((e) => {
          console.warn("[SW] Registration failed:", e.message)
        })
    }
  }, [])
  return null
}
