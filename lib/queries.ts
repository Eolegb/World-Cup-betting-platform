import { db } from "@/lib/db"
import { bet, ledger, match, matchEvent, profile, user } from "@/lib/db/schema"
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
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  const profiles = await db.select().from(profile)
  const allBets = await db.select().from(bet)

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
