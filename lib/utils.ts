import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStage(s: string | null): string {
  if (!s) return "Coupe du Monde 2026"
  const cleaned = s.replace(/_/g, " ").replace(/\s+/g, " ").trim()
  const groupMatch = cleaned.match(/gr\s*oup\s*e?\s*(\w+)$/i) ?? cleaned.match(/groupe?\s*(\w+)$/i)
  if (groupMatch) return `Groupe ${groupMatch[1]}`
  return cleaned
    .replace(/R32/i, "32es de finale")
    .replace(/R16/i, "8es de finale")
    .replace(/QF/i, "Quarts de finale")
    .replace(/SF/i, "Demi-finales")
    .replace(/FINAL$/i, "Finale")
    .replace(/3RD/i, "Petite finale")
}
