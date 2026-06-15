"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/format"
import { SignOutButton } from "@/components/sign-out-button"
import { Trophy, Home, Ticket, Crown, ShieldCheck, Coins } from "lucide-react"

type NavProps = {
  displayName: string
  balance: number
  isAdmin: boolean
}

const LINKS = [
  { href: "/", label: "Matchs", icon: Home },
  { href: "/mes-paris", label: "Mes paris", icon: Ticket },
  { href: "/classement", label: "Classement", icon: Crown },
]

export function AppNav({ displayName, balance, isAdmin }: NavProps) {
  const pathname = usePathname()
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin", icon: ShieldCheck }] : LINKS

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="BetRod" className="h-9 w-9 rounded-xl object-contain" />
          <span className="font-heading text-base leading-none hidden sm:block">
            Bet<span className="text-primary">Rod</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          {links.map((l) => {
            const Icon = l.icon
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(l.href)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5">
            <Coins className="h-4 w-4 text-gold" />
            <div className="leading-none">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cagnotte</p>
              <p className="font-heading text-sm text-gold tabular">{formatMoney(balance)}</p>
            </div>
          </div>
          <span className="hidden sm:block text-sm text-muted-foreground max-w-[10rem] truncate" title={displayName}>
            {displayName}
          </span>
          <SignOutButton />
        </div>
      </div>

      {/* Mobile nav - bottom tab bar style */}
      <nav className="md:hidden flex items-center justify-around border-t border-border bg-background px-1 pb-safe">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0 text-[10px] font-medium transition-colors",
                isActive(l.href)
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{l.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
