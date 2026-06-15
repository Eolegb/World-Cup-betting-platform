import type { BetRow } from "@/lib/queries"

interface BetStatsInput {
  status: string
  label: string
  marketType: string
  stake: number
  odds: number
  matchId: number
  potentialPayout: number
}

const TEAM_NAMES = [
  "France", "Brésil", "Argentine", "Allemagne", "Espagne",
  "Angleterre", "Portugal", "Italie", "Pays-Bas", "Belgique",
  "Croatie", "Maroc", "Sénégal", "Uruguay", "Colombie",
  "Mexique", "Japon", "Corée du Sud",
]

const MARKET_NAMES: Record<string, string> = {
  winner: "les vainqueurs",
  exact_score: "les scores exacts",
  total_goals: "les totaux de buts",
  both_score: "les deux équipes marquent",
  first_scorer: "le premier buteur",
  over_under: "les over/under",
  handicap: "les handicaps",
  half_time: "les mi-temps",
}

export function generateFunStat(userName: string, bets: BetStatsInput[]): string {
  const finished = bets.filter((b) => b.status === "won" || b.status === "lost")
  const won = finished.filter((b) => b.status === "won")
  const lost = finished.filter((b) => b.status === "lost")

  if (finished.length < 3) {
    return `${userName}, encore quelques paris et on pourra vraiment te juger 👀`
  }

  const winRate = won.length / finished.length

  const marketStats = new Map<string, { won: number; total: number }>()
  for (const b of finished) {
    const m = marketStats.get(b.marketType) ?? { won: 0, total: 0 }
    m.total++
    if (b.status === "won") m.won++
    marketStats.set(b.marketType, m)
  }

  let bestMarket = ""
  let bestMarketRate = 0
  let worstMarket = ""
  let worstMarketRate = 1
  let worstMarketTotal = 0
  for (const [type, stats] of marketStats) {
    if (stats.total >= 2) {
      const rate = stats.won / stats.total
      if (rate > bestMarketRate) {
        bestMarketRate = rate
        bestMarket = type
      }
      if (rate < worstMarketRate) {
        worstMarketRate = rate
        worstMarket = type
        worstMarketTotal = stats.total
      }
    }
  }

  // Detect teams from labels
  const teamBets = new Map<string, { lost: number; total: number }>()
  for (const b of finished) {
    for (const team of TEAM_NAMES) {
      if (b.label.includes(team)) {
        const t = teamBets.get(team) ?? { lost: 0, total: 0 }
        t.total++
        if (b.status === "lost") t.lost++
        teamBets.set(team, t)
      }
    }
  }

  // Favorite team = most bet on
  let favoriteTeam = ""
  let favoriteTeamCount = 0
  for (const [team, stats] of teamBets) {
    if (stats.total > favoriteTeamCount) {
      favoriteTeamCount = stats.total
      favoriteTeam = team
    }
  }

  // Team with most losses
  let jinxTeam = ""
  let jinxLossCount = 0
  for (const [team, stats] of teamBets) {
    if (stats.lost >= 3 && stats.lost > jinxLossCount) {
      jinxLossCount = stats.lost
      jinxTeam = team
    }
  }

  // Team with best win rate
  let luckyTeam = ""
  let luckyTeamRate = 0
  let luckyTeamTotal = 0
  for (const [team, stats] of teamBets) {
    if (stats.total >= 3) {
      const rate = (stats.total - stats.lost) / stats.total
      if (rate > luckyTeamRate) {
        luckyTeamRate = rate
        luckyTeam = team
        luckyTeamTotal = stats.total
      }
    }
  }

  // Exact score specialist
  const exactScoreBets = finished.filter((b) => b.marketType === "exact_score")
  const exactScoreWon = exactScoreBets.filter((b) => b.status === "won")

  // High stakes analysis
  const bigBets = bets.filter((b) => b.stake >= 500)
  const bigWon = bigBets.filter((b) => b.status === "won")

  // Consecutive losses
  let maxConsecutiveLosses = 0
  let currentStreak = 0
  for (const b of [...finished].sort((a, b) => (b as any).createdAt?.getTime?.() ?? 0 - (a as any).createdAt?.getTime?.() ?? 0)) {
    if (b.status === "lost") {
      currentStreak++
      if (currentStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentStreak
    } else {
      currentStreak = 0
    }
  }

  // All-in detection
  const allInBets = bets.filter((b) => {
    const totalStake = bets.reduce((s, x) => s + x.stake, 0)
    const avgStake = totalStake / bets.length
    return b.stake >= avgStake * 3 && b.stake >= 300
  })

  // Generate fun stat
  const pool: string[] = []

  if (jinxTeam && jinxLossCount >= 3) {
    pool.push(`Tu as perdu ${jinxLossCount} fois contre ${jinxTeam}… c'est ta bête noire ? 👻`)
  }

  if (luckyTeam && luckyTeamRate >= 0.8 && luckyTeamTotal >= 3) {
    pool.push(`Avec ${luckyTeam}, tu as le flair : ${Math.round(luckyTeamRate * 100)}% de réussite ! ⭐`)
  }

  if (exactScoreWon.length >= 2 && exactScoreBets.length >= 3) {
    const rate = Math.round((exactScoreWon.length / exactScoreBets.length) * 100)
    pool.push(`Imbattable sur les scores exacts : ${exactScoreWon.length}/${exactScoreBets.length} (${rate}%) ! 🎯`)
  }

  if (winRate >= 0.75 && finished.length >= 6) {
    pool.push(`Avec ${Math.round(winRate * 100)}% de réussite, ${userName} est en mode gourou 🔮`)
  }

  if (winRate <= 0.3 && finished.length >= 8) {
    pool.push(`${userName}, ${Math.round(winRate * 100)}% de réussite… t'as pensé à consulter un marabout ? 🤡`)
  }

  if (bestMarket && bestMarketRate >= 0.66) {
    const name = MARKET_NAMES[bestMarket] ?? bestMarket
    pool.push(`Ton point fort ? ${name} (${Math.round(bestMarketRate * 100)}% de réussite) 💪`)
  }

  if (worstMarket && worstMarketTotal >= 3 && worstMarketRate <= 0.33) {
    const name = MARKET_NAMES[worstMarket] ?? worstMarket
    pool.push(`Évite ${name}, vraiment (${Math.round(worstMarketRate * 100)}% seulement) 😬`)
  }

  if (favoriteTeam && favoriteTeamCount >= 5) {
    pool.push(`Tu as un faible pour ${favoriteTeam}, hein ? ${favoriteTeamCount} paris dessus ! ❤️`)
  }

  if (allInBets.length >= 3) {
    const wonCount = allInBets.filter((b) => b.status === "won").length
    if (wonCount >= allInBets.length * 0.5) {
      pool.push(`Le roi du all-in : ${wonCount}/${allInBets.length} gros paris gagnés 💰`)
    } else {
      pool.push(`Faut arrêter les paris flambeurs, ${userName} 🎰`)
    }
  }

  if (maxConsecutiveLosses >= 5) {
    pool.push(`${maxConsecutiveLosses} défaites d'affilée… la loose en série ! 😭`)
  }

  if (bigWon.length >= 3 && bigBets.length >= 5) {
    pool.push(`Les gros paris te réussissent : ${bigWon.length}/${bigBets.length} 💎`)
  }

  if (won.length === finished.length && finished.length >= 5) {
    pool.push(`100% de réussite sur ${finished.length} paris. ${userName}, t'es un sorcier 🧙`)
  }

  // Fallbacks
  if (pool.length === 0) {
    pool.push(`${userName}, ${won.length}/${finished.length} paris gagnés. Continue comme ça ! ⚽`)
    pool.push(`${won.length} victoires, ${lost.length} défaites. Un bilan honorable, ${userName} 📊`)
    pool.push(`Pas de tendance claire pour ${userName}… un vrai mystère 🕵️`)
  }

  return pool[Math.floor(Math.random() * pool.length)]
}

export interface UserStats {
  successRate: number
  totalStaked: number
  totalWon: number
  totalLost: number
  bestMarket: string
  worstMarket: string
  favoriteTeam: string | null
}

export function getUserStats(bets: BetRow[]): UserStats {
  const finished = bets.filter((b) => b.status === "won" || b.status === "lost")
  const won = finished.filter((b) => b.status === "won")
  const lost = finished.filter((b) => b.status === "lost")

  const totalStaked = bets.reduce((s, b) => s + b.stake, 0)
  const totalWon = won.reduce((s, b) => s + b.payout, 0)
  const totalLost = lost.reduce((s, b) => s + b.stake, 0)
  const successRate = finished.length > 0 ? won.length / finished.length : 0

  const marketMap = new Map<string, { won: number; total: number }>()
  for (const b of finished) {
    const m = marketMap.get(b.marketType) ?? { won: 0, total: 0 }
    m.total++
    if (b.status === "won") m.won++
    marketMap.set(b.marketType, m)
  }

  let bestMarket = ""
  let bestRate = 0
  let worstMarket = ""
  let worstRate = 1
  for (const [type, stats] of marketMap) {
    if (stats.total >= 2) {
      const rate = stats.won / stats.total
      if (rate > bestRate) { bestRate = rate; bestMarket = type }
      if (rate < worstRate) { worstRate = rate; worstMarket = type }
    }
  }

  // Favorite team from labels
  const teamCount = new Map<string, number>()
  for (const b of finished) {
    for (const team of TEAM_NAMES) {
      if (b.label.includes(team)) {
        teamCount.set(team, (teamCount.get(team) ?? 0) + 1)
      }
    }
  }
  let favoriteTeam: string | null = null
  let maxCount = 0
  for (const [team, count] of teamCount) {
    if (count > maxCount) { maxCount = count; favoriteTeam = team }
  }

  return {
    successRate,
    totalStaked,
    totalWon,
    totalLost,
    bestMarket: bestMarket || "-",
    worstMarket: worstMarket || "-",
    favoriteTeam,
  }
}
