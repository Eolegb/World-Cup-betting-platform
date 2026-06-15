// Badge system types and award logic

export type BadgeType = "prophet" | "flop" | "all_in" | "hot_streak" | "perfect_score" | "group_master" | "early_bird"

export const BADGE_INFO: Record<BadgeType, { name: string; emoji: string; description: string }> = {
  prophet: { name: "Prophète", emoji: "🔮", description: "5 scores exacts réussis" },
  flop: { name: "Flop", emoji: "🤡", description: "5 paris perdus d'affilée" },
  all_in: { name: "All-in", emoji: "💰", description: "Miser toute sa cagnotte d'un coup" },
  hot_streak: { name: "En feu", emoji: "🔥", description: "5 victoires d'affilée" },
  perfect_score: { name: "Parfait", emoji: "💎", description: "Score exact trouvé" },
  group_master: { name: "Maître des groupes", emoji: "👑", description: "A prédit tous les qualifiés d'un groupe" },
  early_bird: { name: "Lève-tôt", emoji: "🐦", description: "Pari placé 24h avant le match" },
}

export function getBadgeEmoji(type: string): string {
  return BADGE_INFO[type as BadgeType]?.emoji ?? "🏅"
}

export function getBadgeName(type: string): string {
  return BADGE_INFO[type as BadgeType]?.name ?? type
}

export function getBadgeDescription(type: string): string {
  return BADGE_INFO[type as BadgeType]?.description ?? ""
}

export function isJokerAvailable(jokerUsedAt: Date | null): boolean {
  if (!jokerUsedAt) return true
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(jokerUsedAt).getTime() > oneWeek
}
