import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStage(s: string | null): string {
  if (!s) return "Coupe du Monde 2026"
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/GR\s*OUP\s*/i, "Groupe ")
    .replace(/GROUP\s*/i, "Groupe ")
    .replace(/R32/i, "32es de finale")
    .replace(/R16/i, "8es de finale")
    .replace(/QF/i, "Quarts de finale")
    .replace(/SF/i, "Demi-finales")
    .replace(/FINAL\b/i, "Finale")
    .replace(/3RD/i, "Petite finale")
}
