"use server"

import { db } from "@/lib/db"
import {
  bet,
  ledger,
  profile,
  match,
  activityFeed,
  badge,
  betReaction,
  chatMessage,
  tournamentPrediction,
  user,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { potentialPayout, MARKET_LABELS, type MarketType } from "@/lib/markets"
import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { postActivity } from "./social"

export type PlaceBetInput = {
  matchId: number
  marketType: string
  label: string
  selection: Record<string, unknown>
  odds: number
  stake: number
  minuteFrom?: number | null
  minuteTo?: number | null
}

export async function placeBet(input: PlaceBetInput) {
  const userId = await getUserId()

  const stake = Math.floor(input.stake)
  if (!Number.isFinite(stake) || stake <= 0) {
    return { ok: false as const, error: "Mise invalide." }
  }
  const odds = Math.round(input.odds * 100) / 100
  if (!Number.isFinite(odds) || odds <= 1) {
    return { ok: false as const, error: "Cote invalide." }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [m] = await tx.select({ status: match.status }).from(match).where(eq(match.id, input.matchId)).limit(1)
      if (!m) throw new Error("MATCH_NOT_FOUND")
      if (m.status !== "scheduled") throw new Error("MATCH_STARTED")

      const rows = await tx.select().from(profile).where(eq(profile.userId, userId)).limit(1)
      if (!rows.length) throw new Error("PROFILE_MISSING")
      const current = rows[0]
      if (current.balance < stake) throw new Error("INSUFFICIENT")

      const newBalance = current.balance - stake
      await tx.update(profile).set({ balance: newBalance }).where(eq(profile.userId, userId))

      const [created] = await tx
        .insert(bet)
        .values({
          userId,
          matchId: input.matchId,
          marketType: input.marketType,
          label: input.label,
          selection: input.selection,
          minuteFrom: input.minuteFrom ?? null,
          minuteTo: input.minuteTo ?? null,
          stake,
          odds: odds.toFixed(2),
          potentialPayout: potentialPayout(stake, odds),
          status: "pending",
        })
        .returning()

      await tx.insert(ledger).values({
        userId,
        betId: created.id,
        amount: -stake,
        balanceAfter: newBalance,
        reason: `Mise: ${input.label}`,
      })

      return { balance: newBalance, betId: created.id }
    })

    revalidatePath("/")
    revalidatePath("/mes-paris")
    revalidatePath(`/match/${input.matchId}`)
    return { ok: true as const, balance: result.balance }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR"
    if (msg === "INSUFFICIENT") return { ok: false as const, error: "Solde insuffisant pour cette mise." }
    if (msg === "PROFILE_MISSING") return { ok: false as const, error: "Profil introuvable." }
    if (msg === "MATCH_NOT_FOUND") return { ok: false as const, error: "Match introuvable." }
    if (msg === "MATCH_STARTED") return { ok: false as const, error: "Les paris sont fermés pour ce match (déjà commencé)." }
    return { ok: false as const, error: "Impossible de placer le pari." }
  }
}

/** Cancel a still-pending bet on a match that hasn't started; refunds the stake. */
export async function cancelBet(betId: number) {
  const userId = await getUserId()
  try {
    const newBalance = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(bet)
        .where(and(eq(bet.id, betId), eq(bet.userId, userId)))
        .limit(1)
      if (!rows.length) throw new Error("NOT_FOUND")
      const b = rows[0]
      if (b.status !== "pending") throw new Error("NOT_PENDING")

      await tx.delete(bet).where(eq(bet.id, betId))
      const [p] = await tx
        .update(profile)
        .set({ balance: sql`${profile.balance} + ${b.stake}` })
        .where(eq(profile.userId, userId))
        .returning()

      await tx.insert(ledger).values({
        userId,
        betId: null,
        amount: b.stake,
        balanceAfter: p.balance,
        reason: `Annulation: ${b.label}`,
      })
      return p.balance
    })
    revalidatePath("/")
    revalidatePath("/mes-paris")
    return { ok: true as const, balance: newBalance }
  } catch {
    return { ok: false as const, error: "Annulation impossible (pari déjà résolu ou match commencé)." }
  }
}

/**
 * Place a combined (multi-match) bet atomically.
 * All selections must be on scheduled matches. The total stake is deducted once
 * and a single bet record is created with marketType = "combined".
 */
export async function placeCombinedBet(bets: PlaceBetInput[], totalStake: number) {
  const userId = await getUserId()
  const stake = Math.floor(totalStake)

  if (!Number.isFinite(stake) || stake <= 0) {
    return { ok: false as const, error: "Mise invalide." }
  }
  if (!bets.length || bets.length < 2 || bets.length > 5) {
    return { ok: false as const, error: "Un pari combiné doit contenir entre 2 et 5 sélections." }
  }

  const combinedOdds = bets.reduce((acc, b) => acc * Math.round(b.odds * 100) / 100, 1)
  const roundedOdds = Math.round(combinedOdds * 100) / 100
  if (!Number.isFinite(roundedOdds) || roundedOdds < 1.01) {
    return { ok: false as const, error: "Cote combinée invalide." }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const matchIds = [...new Set(bets.map((b) => b.matchId))]
      const matches = await tx.select({ id: match.id, status: match.status }).from(match).where(sql`${match.id} = any(${matchIds})`)
      const statusById = new Map(matches.map((m) => [m.id, m.status]))
      for (const b of bets) {
        const s = statusById.get(b.matchId)
        if (!s) throw new Error("MATCH_NOT_FOUND")
        if (s !== "scheduled") throw new Error("MATCH_STARTED")
      }

      const rows = await tx.select().from(profile).where(eq(profile.userId, userId)).limit(1)
      if (!rows.length) throw new Error("PROFILE_MISSING")
      const current = rows[0]
      if (current.balance < stake) throw new Error("INSUFFICIENT")

      const newBalance = current.balance - stake
      await tx.update(profile).set({ balance: newBalance }).where(eq(profile.userId, userId))

      const summaryLabel = `Pari combiné x${bets.length}: ${bets.map((b) => b.label).join(" + ")}`

      const [created] = await tx
        .insert(bet)
        .values({
          userId,
          matchId: bets[0].matchId,
          marketType: "combined",
          label: summaryLabel,
          selection: {
            type: "combined",
            selections: bets.map((b) => ({
              matchId: b.matchId,
              marketType: b.marketType,
              label: b.label,
              selection: b.selection,
              odds: Math.round(b.odds * 100) / 100,
            })),
          },
          stake,
          odds: roundedOdds.toFixed(2),
          potentialPayout: potentialPayout(stake, roundedOdds),
          status: "pending",
        })
        .returning()

      await tx.insert(ledger).values({
        userId,
        betId: created.id,
        amount: -stake,
        balanceAfter: newBalance,
        reason: `Pari combiné x${bets.length}`,
      })

      return { balance: newBalance, betId: created.id }
    })

    await postActivity("bet_placed", `Pari combiné x${bets.length} placé`, null, result.betId)

    revalidatePath("/")
    revalidatePath("/mes-paris")
    for (const b of bets) {
      revalidatePath(`/match/${b.matchId}`)
    }
    return { ok: true as const, balance: result.balance }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR"
    if (msg === "INSUFFICIENT") return { ok: false as const, error: "Solde insuffisant pour cette mise." }
    if (msg === "PROFILE_MISSING") return { ok: false as const, error: "Profil introuvable." }
    if (msg === "MATCH_NOT_FOUND") return { ok: false as const, error: "Un des matchs est introuvable." }
    if (msg === "MATCH_STARTED") return { ok: false as const, error: "Un des matchs a déjà commencé." }
    return { ok: false as const, error: "Impossible de placer le pari combiné." }
  }
}

/**
 * Mark a pending bet as a joker, doubling its potential payout.
 * Can only be used once per week (7-day rolling window).
 */
export async function useJoker(betId: number) {
  const userId = await getUserId()

  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(bet)
        .where(and(eq(bet.id, betId), eq(bet.userId, userId)))
        .limit(1)
      if (!rows.length) throw new Error("NOT_FOUND")
      const b = rows[0]
      if (b.status !== "pending") throw new Error("NOT_PENDING")
      if (b.isJoker) throw new Error("ALREADY_JOKER")

      const [p] = await tx.select().from(profile).where(eq(profile.userId, userId)).limit(1)
      if (!p) throw new Error("PROFILE_MISSING")

      const now = new Date()
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      if (p.jokerUsedAt) {
        const elapsed = now.getTime() - p.jokerUsedAt.getTime()
        if (elapsed < sevenDaysMs) {
          const nextAvailable = new Date(p.jokerUsedAt.getTime() + sevenDaysMs)
          throw new Error(`JOKER_COOLDOWN:${nextAvailable.toISOString()}`)
        }
      }

      const doubledPayout = b.potentialPayout * 2
      await tx
        .update(bet)
        .set({ isJoker: true, potentialPayout: doubledPayout })
        .where(eq(bet.id, betId))

      await tx.update(profile).set({ jokerUsedAt: now }).where(eq(profile.userId, userId))

      return { betId, potentialPayout: doubledPayout }
    })

    await postActivity("joker_used", `Joker activé sur "${betId}"`, null, betId)

    revalidatePath("/")
    revalidatePath("/mes-paris")
    return { ok: true as const, potentialPayout: result.potentialPayout }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR"
    if (msg === "NOT_FOUND") return { ok: false as const, error: "Pari introuvable." }
    if (msg === "NOT_PENDING") return { ok: false as const, error: "Le joker ne peut être utilisé que sur un pari en cours." }
    if (msg === "ALREADY_JOKER") return { ok: false as const, error: "Ce pari utilise déjà un joker." }
    if (msg === "PROFILE_MISSING") return { ok: false as const, error: "Profil introuvable." }
    if (msg.startsWith("JOKER_COOLDOWN:")) {
      const iso = msg.slice("JOKER_COOLDOWN:".length)
      return {
        ok: false as const,
        error: `Joker déjà utilisé cette semaine. Disponible à nouveau le ${new Date(iso).toLocaleDateString("fr-FR")}.`,
      }
    }
    return { ok: false as const, error: "Impossible d'utiliser le joker." }
  }
}

/**
 * Store a tournament winner prediction. Each user can predict only once.
 */
export async function predictWinner(team: string) {
  const userId = await getUserId()
  const trimmed = team.trim()
  if (!trimmed) return { ok: false as const, error: "Équipe invalide." }
  if (trimmed.length > 100) return { ok: false as const, error: "Nom d'équipe trop long." }

  try {
    const existing = await db
      .select()
      .from(tournamentPrediction)
      .where(eq(tournamentPrediction.userId, userId))
      .limit(1)
    if (existing.length) {
      return {
        ok: false as const,
        error: `Tu as déjà pronostiqué ${existing[0].predictedTeam} comme vainqueur. Un seul pronostic est autorisé.`,
      }
    }

    await db.insert(tournamentPrediction).values({
      userId,
      predictedTeam: trimmed,
    })

    await postActivity("prediction", `A pronostiqué ${trimmed} comme vainqueur du tournoi`)

    revalidatePath("/")
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: "Impossible d'enregistrer le pronostic." }
  }
}

export type BetForMatchRow = {
  id: number
  userId: string
  displayName: string
  avatarColor: string
  image: string | null
  label: string
  marketType: string
  selection: unknown | null
  stake: number | null
  odds: string | null
  potentialPayout: number | null
  status: string
  isJoker: boolean
  createdAt: Date
}

/**
 * Returns all bets for a match with user display names and avatars.
 * If the match is still scheduled, only shows "a parié sur [market label]"
 * to hide the exact selection. For live/finished matches, shows full details.
 */
export async function getBetsForMatch(matchId: number): Promise<BetForMatchRow[]> {
  const [m] = await db.select({ status: match.status }).from(match).where(eq(match.id, matchId)).limit(1)
  if (!m) return []

  const rows = await db
    .select({
      id: bet.id,
      userId: bet.userId,
      displayName: profile.displayName,
      avatarColor: profile.avatarColor,
      image: user.image,
      label: bet.label,
      marketType: bet.marketType,
      selection: bet.selection,
      stake: bet.stake,
      odds: bet.odds,
      potentialPayout: bet.potentialPayout,
      status: bet.status,
      isJoker: bet.isJoker,
      createdAt: bet.createdAt,
    })
    .from(bet)
    .innerJoin(profile, eq(bet.userId, profile.userId))
    .innerJoin(user, eq(bet.userId, user.id))
    .where(eq(bet.matchId, matchId))
    .orderBy(desc(bet.createdAt))

  if (m.status === "scheduled") {
    return rows.map((row) => ({
      ...row,
      selection: null,
      label: `a parié sur ${MARKET_LABELS[row.marketType as MarketType] ?? row.marketType}`,
      odds: null,
      potentialPayout: null,
      stake: null,
    }))
  }

  return rows.map((row) => ({
    ...row,
    odds: row.odds !== null ? String(row.odds) : null,
  }))
}

/**
 * Check if the current user can use a joker (i.e. hasn't used one in the last 7 days).
 */
export async function canUseJoker(): Promise<{ available: boolean; resetAt: Date | null }> {
  const userId = await getUserId()
  const [p] = await db.select({ jokerUsedAt: profile.jokerUsedAt }).from(profile).where(eq(profile.userId, userId)).limit(1)
  if (!p) return { available: false, resetAt: null }
  if (!p.jokerUsedAt) return { available: true, resetAt: null }
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const elapsed = now - p.jokerUsedAt.getTime()
  if (elapsed >= sevenDaysMs) return { available: true, resetAt: null }
  return { available: false, resetAt: new Date(p.jokerUsedAt.getTime() + sevenDaysMs) }
}
