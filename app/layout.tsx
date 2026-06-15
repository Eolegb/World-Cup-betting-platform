import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Archivo } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
})

export const metadata: Metadata = {
  title: "Prono CDM 2026 — Paris entre amis",
  description:
    "Plateforme de paris conviviale entre amis pour la Coupe du Monde 2026 : pronostics live, points et classement.",
  generator: "v0.app",
  manifest: "/manifest.json",
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
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
