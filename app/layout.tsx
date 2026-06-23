import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import "./globals.css"

export const metadata: Metadata = {
  title: "BetRod",
  description:
    "Plateforme de paris conviviale entre amis pour la Coupe du Monde 2026 : pronostics live, points et classement.",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export const viewport = {
  themeColor: "#13241c",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="bg-background">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
        <Toaster position="top-center" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
