export function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatOdds(value: number | string): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : value
  return n.toFixed(2)
}

export function formatMinute(min: number | null, extra?: number | null): string {
  if (min == null) return ""
  if (extra && extra > 0) return `${min}+${extra}'`
  return `${min}'`
}

export function statusLabel(status: string): string {
  switch (status) {
    case "live":
      return "En direct"
    case "finished":
      return "Terminé"
    case "scheduled":
    default:
      return "À venir"
  }
}

export function betStatusLabel(status: string): string {
  switch (status) {
    case "won":
      return "Gagné"
    case "lost":
      return "Perdu"
    case "void":
      return "Annulé"
    case "pending":
    default:
      return "En cours"
  }
}
