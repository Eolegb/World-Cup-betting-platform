// =============================================================================
// Bracket — arbre du tournoi à élimination directe (World Cup 2026)
// =============================================================================

import { db } from "@/lib/db"
import { match, setting } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { MatchRow } from "@/lib/queries"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BracketSlot = {
  wc26MatchId: number
  round: string        // "R32" | "R16" | "QF" | "SF"
  row: number          // position visuelle (0 = haut)
  feedsFrom: [number, number]
  match: MatchRow | null
}

export type BracketHalf = {
  rounds: { name: string; shortName: string; slots: BracketSlot[] }[]
}

export type BracketData = {
  left: BracketHalf
  right: BracketHalf
  thirdPlace: BracketSlot | null
  final: BracketSlot | null
}

// ---------------------------------------------------------------------------
// Structure du bracket WC26 2026
// ---------------------------------------------------------------------------

type SlotDef = { wc26MatchId: number; round: string; row: number; feedsFrom: [number, number]; side: "left" | "right" }

const BRACKET_DEFINITION: SlotDef[] = [
  // ═══ LEFT SIDE (→ SF 101 → Final 104) ═══════════════════════════════════
  // R32
  { wc26MatchId: 73, round: "R32", row: 0, feedsFrom: [0,0], side: "left" },
  { wc26MatchId: 75, round: "R32", row: 1, feedsFrom: [0,0], side: "left" },
  { wc26MatchId: 74, round: "R32", row: 2, feedsFrom: [0,0], side: "left" },
  { wc26MatchId: 77, round: "R32", row: 3, feedsFrom: [0,0], side: "left" },
  { wc26MatchId: 76, round: "R32", row: 4, feedsFrom: [0,0], side: "left" },
  { wc26MatchId: 78, round: "R32", row: 5, feedsFrom: [0,0], side: "left" },
  { wc26MatchId: 79, round: "R32", row: 6, feedsFrom: [0,0], side: "left" },
  { wc26MatchId: 80, round: "R32", row: 7, feedsFrom: [0,0], side: "left" },
  // R16
  { wc26MatchId: 90, round: "R16", row: 0, feedsFrom: [73,75], side: "left" },
  { wc26MatchId: 89, round: "R16", row: 1, feedsFrom: [74,77], side: "left" },
  { wc26MatchId: 91, round: "R16", row: 2, feedsFrom: [76,78], side: "left" },
  { wc26MatchId: 92, round: "R16", row: 3, feedsFrom: [79,80], side: "left" },
  // QF
  { wc26MatchId: 97, round: "QF", row: 0, feedsFrom: [89,90], side: "left" },
  { wc26MatchId: 99, round: "QF", row: 1, feedsFrom: [91,92], side: "left" },
  // SF
  { wc26MatchId: 101, round: "SF", row: 0, feedsFrom: [97,98], side: "left" },

  // ═══ RIGHT SIDE (→ SF 102 → Final 104) ══════════════════════════════════
  // R32
  { wc26MatchId: 81, round: "R32", row: 0, feedsFrom: [0,0], side: "right" },
  { wc26MatchId: 82, round: "R32", row: 1, feedsFrom: [0,0], side: "right" },
  { wc26MatchId: 83, round: "R32", row: 2, feedsFrom: [0,0], side: "right" },
  { wc26MatchId: 84, round: "R32", row: 3, feedsFrom: [0,0], side: "right" },
  { wc26MatchId: 85, round: "R32", row: 4, feedsFrom: [0,0], side: "right" },
  { wc26MatchId: 87, round: "R32", row: 5, feedsFrom: [0,0], side: "right" },
  { wc26MatchId: 86, round: "R32", row: 6, feedsFrom: [0,0], side: "right" },
  { wc26MatchId: 88, round: "R32", row: 7, feedsFrom: [0,0], side: "right" },
  // R16
  { wc26MatchId: 94, round: "R16", row: 0, feedsFrom: [81,82], side: "right" },
  { wc26MatchId: 93, round: "R16", row: 1, feedsFrom: [83,84], side: "right" },
  { wc26MatchId: 96, round: "R16", row: 2, feedsFrom: [85,87], side: "right" },
  { wc26MatchId: 95, round: "R16", row: 3, feedsFrom: [86,88], side: "right" },
  // QF
  { wc26MatchId: 98, round: "QF", row: 0, feedsFrom: [93,94], side: "right" },
  { wc26MatchId: 100, round: "QF", row: 1, feedsFrom: [95,96], side: "right" },
  // SF
  { wc26MatchId: 102, round: "SF", row: 0, feedsFrom: [99,100], side: "right" },

  // ═══ CENTER ═══════════════════════════════════════════════════════════════
  { wc26MatchId: 103, round: "3RD", row: 0, feedsFrom: [101,102], side: "left" },
  { wc26MatchId: 104, round: "FINAL", row: 0, feedsFrom: [101,102], side: "left" },
]

const ROUND_NAMES: Record<string, { name: string; shortName: string }> = {
  R32:   { name: "1/16ᵉ", shortName: "R32" },
  R16:   { name: "1/8ᵉ",  shortName: "R16" },
  QF:    { name: "1/4",    shortName: "QF" },
  SF:    { name: "1/2",    shortName: "SF" },
  "3RD": { name: "3ᵉ place", shortName: "3e" },
  FINAL: { name: "Finale",   shortName: "F" },
}

// ---------------------------------------------------------------------------
// Résolution
// ---------------------------------------------------------------------------

const WC26_PREFIX = 2_000_000_000

function buildHalf(defs: SlotDef[], matchMap: Map<number | null, MatchRow>): BracketHalf {
  const roundOrder = ["R32", "R16", "QF", "SF"]
  const grouped = new Map<string, BracketSlot[]>()

  for (const d of defs) {
    const extId = WC26_PREFIX + d.wc26MatchId
    const m = matchMap.get(extId) ?? null
    const slot: BracketSlot = { wc26MatchId: d.wc26MatchId, round: d.round, row: d.row, feedsFrom: d.feedsFrom, match: m }
    if (!grouped.has(d.round)) grouped.set(d.round, [])
    grouped.get(d.round)!.push(slot)
  }

  const rounds = roundOrder
    .filter(k => grouped.has(k))
    .map(k => {
      const slots = grouped.get(k)!.sort((a, b) => a.row - b.row)
      const info = ROUND_NAMES[k]
      return { name: info.name, shortName: info.shortName, slots }
    })

  return { rounds }
}

export async function buildBracketData(): Promise<BracketData> {
  const allMatches = await db.select().from(match)
  const matchByExtId = new Map<number | null, MatchRow>()
  for (const m of allMatches) {
    if (m.externalId) matchByExtId.set(m.externalId, m)
  }

  const leftDefs = BRACKET_DEFINITION.filter(d => d.side === "left" && d.round !== "3RD" && d.round !== "FINAL")
  const rightDefs = BRACKET_DEFINITION.filter(d => d.side === "right")

  const finalDef = BRACKET_DEFINITION.find(d => d.round === "FINAL")!
  const thirdDef = BRACKET_DEFINITION.find(d => d.round === "3RD")!

  const finalExtId = WC26_PREFIX + finalDef.wc26MatchId
  const thirdExtId = WC26_PREFIX + thirdDef.wc26MatchId

  return {
    left: buildHalf(leftDefs, matchByExtId),
    right: buildHalf(rightDefs, matchByExtId),
    final: { wc26MatchId: finalDef.wc26MatchId, round: "FINAL", row: 0, feedsFrom: finalDef.feedsFrom, match: matchByExtId.get(finalExtId) ?? null },
    thirdPlace: { wc26MatchId: thirdDef.wc26MatchId, round: "3RD", row: 0, feedsFrom: thirdDef.feedsFrom, match: matchByExtId.get(thirdExtId) ?? null },
  }
}

// ---------------------------------------------------------------------------
// Visibilité
// ---------------------------------------------------------------------------

export const BRACKET_PUBLIC_DATE = new Date("2026-06-28T00:00:00Z")

export async function isBracketVisible(isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true
  try {
    const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, "bracket_visible")).limit(1)
    const published = row ? (row.value as boolean) === true : false
    return published && new Date() >= BRACKET_PUBLIC_DATE
  } catch { return false }
}

export async function isBracketPublished(): Promise<boolean> {
  try {
    const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, "bracket_visible")).limit(1)
    return row ? (row.value as boolean) === true : false
  } catch { return false }
}

export async function setBracketVisibility(visible: boolean): Promise<void> {
  try {
    await db.insert(setting).values({ key: "bracket_visible", value: visible })
      .onConflictDoUpdate({ target: setting.key, set: { value: visible, updatedAt: new Date() } })
  } catch (e) { console.error("[bracket] Failed to set visibility:", e) }
}
