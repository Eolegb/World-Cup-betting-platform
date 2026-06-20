"use client"

import { useState, useEffect } from "react"
import { subscribeToPush, unsubscribeFromPush } from "@/app/actions/push"
import { toast } from "sonner"
import { Bell, BellOff } from "lucide-react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | "">("")
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    setSupported(true)
    if ("Notification" in window) {
      setPermission(Notification.permission)
    }
    // Check existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    }).catch(() => {
      // SW not ready yet, will retry on click
    })
    fetch("/api/push/public-key")
      .then((res) => res.json())
      .then((data) => {
        if (data?.key) setPublicKey(String(data.key))
      })
      .catch(() => {
        // keep fallback null
      })
  }, [])

  async function toggle() {
    setLoading(true)
    try {
      if (subscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await unsubscribeFromPush(sub.endpoint)
        }
        setSubscribed(false)
        setPermission(Notification.permission)
        toast.success("Notifications désactivées")
      } else {
        // Request permission first
        if (!("Notification" in window)) {
          toast.error("Ton navigateur ne supporte pas les notifications.")
          setLoading(false)
          return
        }

        if (Notification.permission !== "granted") {
          const result = await Notification.requestPermission()
          setPermission(result)
          if (result !== "granted") {
            toast.error("Tu as refusé les notifications. Change ça dans les réglages du navigateur.")
            setLoading(false)
            return
          }
        }

        // Now subscribe to push
        if (!publicKey) {
          toast.error("La clé push n'est pas disponible. Vérifie la configuration serveur.")
          setLoading(false)
          return
        }

        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        await subscribeToPush(json)
        setSubscribed(true)
        toast.success("Notifs activées ! Tu seras prévenu avant les matchs.")
      }
    } catch (e) {
      console.error("[Push] Error:", e)
      toast.error("Impossible d'activer les notifications. Vérifie que le site est bien en HTTPS et réessaie.")
    }
    setLoading(false)
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
        subscribed
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/40 text-muted-foreground hover:text-foreground"
      }`}
    >
      {subscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
      {loading ? "..." : subscribed ? "Notifs ON" : "Notifs OFF"}
    </button>
  )
}
