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
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
        <Toaster position="top-center" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
