import { db } from "@/lib/db"
import { bet, ledger, match, matchEvent, profile, user, activityFeed, badge, tournamentPrediction } from "@/lib/db/schema"
import { buildMarkets, type MatchLike, type OddsInputs } from "@/lib/match-markets"
import { matchRoster } from "@/lib/teams"
import { and, desc, eq, inArray } from "drizzle-orm"

export type MatchRow = typeof match.$inferSelect
export type BetRow = typeof bet.$inferSelect
export type EventRow = typeof matchEvent.$inferSelect

export async function getMatches() {
  return db.select().from(match).orderBy(match.kickoff)
}

export async function getMatch(id: number): Promise<MatchRow | null> {
  const rows = await db.select().from(match).where(eq(match.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getMatchEvents(matchId: number): Promise<EventRow[]> {
  return db.select().from(matchEvent).where(eq(matchEvent.matchId, matchId)).orderBy(matchEvent.minute)
}

export function marketsForMatch(m: MatchRow, odds: OddsInputs = {}) {
  const matchLike: MatchLike = {
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
  }
  const players = matchRoster(m.homeTeam, m.awayTeam)

  // Use real odds from DB if available
  const storedOdds = (m as any).oddsJson as OddsInputs | null
  if (storedOdds) {
    return buildMarkets(matchLike, players, { ...odds, ...storedOdds })
  }

  return buildMarkets(matchLike, players, odds)
}

export async function getUserBets(userId: string) {
  const bets = await db.select().from(bet).where(eq(bet.userId, userId)).orderBy(desc(bet.createdAt))
  const matchIds = [...new Set(bets.map((b) => b.matchId))]
  const matches = matchIds.length ? await db.select().from(match).where(inArray(match.id, matchIds)) : []
  const byId = new Map(matches.map((m) => [m.id, m]))
  return bets.map((b) => ({ bet: b, match: byId.get(b.matchId) ?? null }))
}

export async function getMatchBetsForUser(userId: string, matchId: number) {
  return db
    .select()
    .from(bet)
    .where(and(eq(bet.userId, userId), eq(bet.matchId, matchId)))
    .orderBy(desc(bet.createdAt))
}

export type LeaderRow = {
  userId: string
  displayName: string
  balance: number
  isAdmin: boolean
  pending: number
  won: number
  lost: number
  netProfit: number
  streak: number
  image: string | null
  avatarColor: string
  badges: string[]
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  const profiles = await db.select().from(profile).where(eq(profile.isAdmin, false))
  const allBets = await db.select().from(bet)
  const users = await db.select({ id: user.id, image: user.image }).from(user)
  const allBadges = await db.select().from(badge)

  const userImageMap = new Map(users.map((u) => [u.id, u.image]))
  const badgeMap = new Map<string, string[]>()
  for (const b of allBadges) {
    const arr = badgeMap.get(b.userId) ?? []
    arr.push(b.badgeType)
    badgeMap.set(b.userId, arr)
  }

  const stats = new Map<string, { pending: number; won: number; lost: number }>()
  for (const b of allBets) {
    const s = stats.get(b.userId) ?? { pending: 0, won: 0, lost: 0 }
    if (b.status === "pending") s.pending++
    else if (b.status === "won") s.won++
    else if (b.status === "lost") s.lost++
    stats.set(b.userId, s)
  }

  return profiles
    .map((p) => {
      const s = stats.get(p.userId) ?? { pending: 0, won: 0, lost: 0 }
      return {
        userId: p.userId,
        displayName: p.displayName,
        balance: p.balance,
        isAdmin: p.isAdmin,
        pending: s.pending,
        won: s.won,
        lost: s.lost,
        netProfit: p.balance - 1000,
        streak: p.streak,
        image: userImageMap.get(p.userId) ?? null,
        avatarColor: p.avatarColor,
        badges: badgeMap.get(p.userId) ?? [],
      }
    })
    .sort((a, b) => b.balance - a.balance)
}

export async function getLedger(userId: string) {
  return db.select().from(ledger).where(eq(ledger.userId, userId)).orderBy(desc(ledger.createdAt)).limit(50)
}

/** Count how many real users exist (used to bootstrap the first admin). */
export async function getUserCount() {
  const rows = await db.select({ id: user.id }).from(user)
  return rows.length
}

// --- Activity feed ---

export async function getActivityFeed() {
  return db
    .select({
      id: activityFeed.id,
      userId: activityFeed.userId,
      type: activityFeed.type,
      message: activityFeed.message,
      matchId: activityFeed.matchId,
      betId: activityFeed.betId,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
      displayName: profile.displayName,
    })
    .from(activityFeed)
    .innerJoin(profile, eq(activityFeed.userId, profile.userId))
    .where(eq(profile.isAdmin, false))
    .orderBy(desc(activityFeed.createdAt))
    .limit(30)
}

// --- Badges ---

export async function getUserBadges(userId: string) {
  return db.select().from(badge).where(eq(badge.userId, userId)).orderBy(desc(badge.earnedAt))
}

export async function getAllBadges() {
  return db
    .select({
      id: badge.id,
      userId: badge.userId,
      badgeType: badge.badgeType,
      earnedAt: badge.earnedAt,
      displayName: profile.displayName,
    })
    .from(badge)
    .innerJoin(profile, eq(badge.userId, profile.userId))
    .where(eq(profile.isAdmin, false))
    .orderBy(desc(badge.earnedAt))
}

// --- Tournament predictions ---

export async function getTournamentPredictions() {
  return db
    .select({
      id: tournamentPrediction.id,
      userId: tournamentPrediction.userId,
      predictedTeam: tournamentPrediction.predictedTeam,
      isCorrect: tournamentPrediction.isCorrect,
      bonusAwarded: tournamentPrediction.bonusAwarded,
      createdAt: tournamentPrediction.createdAt,
      displayName: profile.displayName,
    })
    .from(tournamentPrediction)
    .innerJoin(profile, eq(tournamentPrediction.userId, profile.userId))
    .where(eq(profile.isAdmin, false))
    .orderBy(desc(tournamentPrediction.createdAt))
}

// --- Match bets with user names ---

export async function getMatchBets(matchId: number) {
  return db
    .select({
      id: bet.id,
      userId: bet.userId,
      matchId: bet.matchId,
      marketType: bet.marketType,
      label: bet.label,
      selection: bet.selection,
      minuteFrom: bet.minuteFrom,
      minuteTo: bet.minuteTo,
      stake: bet.stake,
      odds: bet.odds,
      potentialPayout: bet.potentialPayout,
      status: bet.status,
      payout: bet.payout,
      isJoker: bet.isJoker,
      bonusPoints: bet.bonusPoints,
      settledAt: bet.settledAt,
      createdAt: bet.createdAt,
      displayName: profile.displayName,
    })
    .from(bet)
    .innerJoin(profile, eq(bet.userId, profile.userId))
    .where(and(eq(bet.matchId, matchId), eq(profile.isAdmin, false)))
    .orderBy(desc(bet.createdAt))
}

// --- User bet statistics ---

export type BetStats = {
  totalBets: number
  won: number
  lost: number
  pending: number
  voidCount: number
  successRate: number
  totalStaked: number
  totalWon: number
  totalLost: number
  netResult: number
}

export async function getUserBetStats(userId: string): Promise<BetStats> {
  const bets = await db.select().from(bet).where(eq(bet.userId, userId))

  const won = bets.filter((b) => b.status === "won")
  const lost = bets.filter((b) => b.status === "lost")
  const pending = bets.filter((b) => b.status === "pending")
  const voided = bets.filter((b) => b.status === "void")
  const finished = won.length + lost.length

  const totalStaked = bets.reduce((s, b) => s + b.stake, 0)
  const totalWon = won.reduce((s, b) => s + b.payout, 0)
  const totalLost = lost.reduce((s, b) => s + b.stake, 0)

  return {
    totalBets: bets.length,
    won: won.length,
    lost: lost.length,
    pending: pending.length,
    voidCount: voided.length,
    successRate: finished > 0 ? won.length / finished : 0,
    totalStaked,
    totalWon,
    totalLost,
    netResult: totalWon - totalLost,
  }
}

// --- Streak leaderboard ---

export async function getStreakLeaderboard() {
  return db
    .select({
      userId: profile.userId,
      displayName: profile.displayName,
      streak: profile.streak,
      bestStreak: profile.bestStreak,
    })
    .from(profile)
    .where(eq(profile.isAdmin, false))
    .orderBy(desc(profile.streak))
}
