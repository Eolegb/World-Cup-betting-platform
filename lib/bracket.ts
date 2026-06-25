// =============================================================================
// Bracket — arbre du tournoi à élimination directe (World Cup 2026)
// -----------------------------------------------------------------------------
// Structure fixe basée sur le bracket officiel FIFA World Cup 2026 (48 équipes).
// Les matchs sont identifiés par leur ID worldcup26.ir.
// =============================================================================

import { db } from "@/lib/db"
import { match, setting } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { MatchRow } from "@/lib/queries"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BracketSlot = {
  /** WC26 game ID */
  wc26MatchId: number
  /** Nom du tour */
  round: string
  /** Rang visuel dans la colonne (0 = haut) */
  row: number
  /** ID WC26 des matchs dont les vainqueurs alimentent ce slot (vide pour R32) */
  feedsFrom: [number, number]
  /** Données du match depuis la DB */
  match: MatchRow | null
}

export type BracketRound = {
  name: string
  shortName: string
  slots: BracketSlot[]
}

export type BracketData = {
  rounds: BracketRound[]
  thirdPlace: BracketSlot | null
  final: BracketSlot | null
}

// ---------------------------------------------------------------------------
// Structure du bracket WC26 2026
// ---------------------------------------------------------------------------

/**
 * Chaque entrée représente un slot dans le bracket.
 * `feedsFrom`: les 2 matchs dont les vainqueurs jouent ce match.
 * `row`: position visuelle dans la colonne (0 = plus haut).
 */
const BRACKET_DEFINITION: { wc26MatchId: number; round: string; row: number; feedsFrom: [number, number] }[] = [
  // ── Round of 32 (16 matchs) ──────────────────────────────────────────────
  { wc26MatchId: 73, round: "R32", row: 0,  feedsFrom: [0, 0] },
  { wc26MatchId: 75, round: "R32", row: 1,  feedsFrom: [0, 0] },
  { wc26MatchId: 74, round: "R32", row: 2,  feedsFrom: [0, 0] },
  { wc26MatchId: 77, round: "R32", row: 3,  feedsFrom: [0, 0] },
  { wc26MatchId: 76, round: "R32", row: 4,  feedsFrom: [0, 0] },
  { wc26MatchId: 78, round: "R32", row: 5,  feedsFrom: [0, 0] },
  { wc26MatchId: 79, round: "R32", row: 6,  feedsFrom: [0, 0] },
  { wc26MatchId: 80, round: "R32", row: 7,  feedsFrom: [0, 0] },
  { wc26MatchId: 81, round: "R32", row: 8,  feedsFrom: [0, 0] },
  { wc26MatchId: 82, round: "R32", row: 9,  feedsFrom: [0, 0] },
  { wc26MatchId: 83, round: "R32", row: 10, feedsFrom: [0, 0] },
  { wc26MatchId: 84, round: "R32", row: 11, feedsFrom: [0, 0] },
  { wc26MatchId: 85, round: "R32", row: 12, feedsFrom: [0, 0] },
  { wc26MatchId: 87, round: "R32", row: 13, feedsFrom: [0, 0] },
  { wc26MatchId: 86, round: "R32", row: 14, feedsFrom: [0, 0] },
  { wc26MatchId: 88, round: "R32", row: 15, feedsFrom: [0, 0] },

  // ── Round of 16 (8 matchs) ───────────────────────────────────────────────
  { wc26MatchId: 90, round: "R16", row: 0, feedsFrom: [73, 75] },
  { wc26MatchId: 89, round: "R16", row: 1, feedsFrom: [74, 77] },
  { wc26MatchId: 91, round: "R16", row: 2, feedsFrom: [76, 78] },
  { wc26MatchId: 92, round: "R16", row: 3, feedsFrom: [79, 80] },
  { wc26MatchId: 94, round: "R16", row: 4, feedsFrom: [81, 82] },
  { wc26MatchId: 93, round: "R16", row: 5, feedsFrom: [83, 84] },
  { wc26MatchId: 96, round: "R16", row: 6, feedsFrom: [85, 87] },
  { wc26MatchId: 95, round: "R16", row: 7, feedsFrom: [86, 88] },

  // ── Quarter-finals (4 matchs) ────────────────────────────────────────────
  { wc26MatchId: 97,  round: "QF", row: 0, feedsFrom: [89, 90] },
  { wc26MatchId: 99,  round: "QF", row: 1, feedsFrom: [91, 92] },
  { wc26MatchId: 98,  round: "QF", row: 2, feedsFrom: [93, 94] },
  { wc26MatchId: 100, round: "QF", row: 3, feedsFrom: [95, 96] },

  // ── Semi-finals (2 matchs) ───────────────────────────────────────────────
  { wc26MatchId: 101, round: "SF", row: 0, feedsFrom: [97, 98] },
  { wc26MatchId: 102, round: "SF", row: 1, feedsFrom: [99, 100] },

  // ── Third place ──────────────────────────────────────────────────────────
  { wc26MatchId: 103, round: "3RD", row: 0, feedsFrom: [101, 102] },

  // ── Final ────────────────────────────────────────────────────────────────
  { wc26MatchId: 104, round: "FINAL", row: 0, feedsFrom: [101, 102] },
]

// Round display names
const ROUND_NAMES: Record<string, { name: string; shortName: string }> = {
  R32:   { name: "1/16e de finale", shortName: "R32" },
  R16:   { name: "1/8e de finale",  shortName: "R16" },
  QF:    { name: "Quarts de finale", shortName: "QF" },
  SF:    { name: "Demi-finales",    shortName: "SF" },
  "3RD": { name: "3ᵉ place",        shortName: "3e" },
  FINAL: { name: "Finale",          shortName: "Finale" },
}

// ---------------------------------------------------------------------------
// Résolution du bracket
// ---------------------------------------------------------------------------

/** Construit l'arbre complet du bracket à partir des matchs en base. */
export async function buildBracketData(): Promise<BracketData> {
  // Charger tous les matchs KO depuis la DB (externalId WC26 = 2_000_000_000 + wc26Id)
  const WC26_PREFIX = 2_000_000_000

  // Récupérer tous les matchs depuis la DB
  const allMatches = await db.select().from(match)
  const matchByExternalId = new Map<number | null, MatchRow>()
  for (const m of allMatches) {
    if (m.externalId) matchByExternalId.set(m.externalId, m)
  }

  // Construire les slots
  const slotsByRound = new Map<string, BracketSlot[]>()
  for (const def of BRACKET_DEFINITION) {
    const extId = WC26_PREFIX + def.wc26MatchId
    const m = matchByExternalId.get(extId) ?? null

    const slot: BracketSlot = {
      wc26MatchId: def.wc26MatchId,
      round: def.round,
      row: def.row,
      feedsFrom: def.feedsFrom,
      match: m,
    }

    if (!slotsByRound.has(def.round)) slotsByRound.set(def.round, [])
    slotsByRound.get(def.round)!.push(slot)
  }

  // Ordonner les slots par row dans chaque round
  const roundOrder = ["R32", "R16", "QF", "SF", "3RD", "FINAL"]
  const rounds: BracketRound[] = []
  let thirdPlace: BracketSlot | null = null
  let finalSlot: BracketSlot | null = null

  for (const key of roundOrder) {
    const slots = slotsByRound.get(key)
    if (!slots || slots.length === 0) continue
    slots.sort((a, b) => a.row - b.row)
    const info = ROUND_NAMES[key]

    if (key === "3RD") {
      thirdPlace = slots[0]
    } else if (key === "FINAL") {
      finalSlot = slots[0]
    } else {
      rounds.push({ name: info.name, shortName: info.shortName, slots })
    }
  }

  return { rounds, thirdPlace, final: finalSlot }
}

// ---------------------------------------------------------------------------
// Résolution du vainqueur
// ---------------------------------------------------------------------------

/** Détermine le vainqueur d'un slot en fonction des matchs qu'il alimente. */
export function resolveWinner(slot: BracketSlot, allSlots: Map<number, BracketSlot>): string | null {
  if (slot.match && slot.match.status === "finished") {
    if (slot.match.homeScore > slot.match.awayScore) return slot.match.homeTeam
    if (slot.match.awayScore > slot.match.homeScore) return slot.match.awayTeam
    return null // match nul (ne devrait pas arriver en KO, mais au cas où)
  }

  // Si pas de match en base, essayer de résoudre depuis les matchs parents
  if (slot.round === "R32") return null

  const [feed1, feed2] = slot.feedsFrom
  if (feed1 === 0 && feed2 === 0) return null

  const parent1 = allSlots.get(feed1)
  const parent2 = allSlots.get(feed2)
  if (!parent1 || !parent2) return null

  // Si les deux parents sont terminés, essayer de trouver le vainqueur
  const w1 = resolveWinner(parent1, allSlots)
  const w2 = resolveWinner(parent2, allSlots)

  // Pour les matchs de 3e place, les participants sont les PERDANTS des demi-finales
  if (slot.round === "3RD") {
    // On ne peut pas déterminer le perdant sans le match, donc on retourne null
    return null
  }

  return null // ne peut être résolu que si le match lui-même est terminé
}

// ---------------------------------------------------------------------------
// Visibilité du bracket
// ---------------------------------------------------------------------------

/** Date à partir de laquelle le bracket peut être visible publiquement. */
export const BRACKET_PUBLIC_DATE = new Date("2026-06-28T00:00:00Z")

/**
 * Vérifie si le bracket est visible pour un utilisateur donné.
 * - Admin : toujours visible
 * - Joueur : visible si l'admin a publié ET qu'on est après le 28 juin
 */
export async function isBracketVisible(isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true

  const [row] = await db
    .select({ value: setting.value })
    .from(setting)
    .where(eq(setting.key, "bracket_visible"))
    .limit(1)

  const published = row ? (row.value as boolean) === true : false
  const afterDate = new Date() >= BRACKET_PUBLIC_DATE

  return published && afterDate
}

/** Retourne true si l'admin a explicitement publié le bracket. */
export async function isBracketPublished(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ value: setting.value })
      .from(setting)
      .where(eq(setting.key, "bracket_visible"))
      .limit(1)
    return row ? (row.value as boolean) === true : false
  } catch {
    // Table setting might not exist yet
    return false
  }
}

/** Active/désactive la visibilité du bracket (admin only). */
export async function setBracketVisibility(visible: boolean): Promise<void> {
  try {
    await db
      .insert(setting)
      .values({ key: "bracket_visible", value: visible })
      .onConflictDoUpdate({
        target: setting.key,
        set: { value: visible, updatedAt: new Date() },
      })
  } catch (e) {
    console.error("[bracket] Failed to set visibility:", e)
  }
}
