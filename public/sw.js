// Service worker for BetRod push notifications
// Handles background push and shows match reminders

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || "BetRod"
  const options = {
    body: data.body || "",
    icon: "/logo.png",
    badge: "/logo.png",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    tag: data.tag || "betrod",
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
