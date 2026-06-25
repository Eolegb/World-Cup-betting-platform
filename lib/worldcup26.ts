/**
 * Client centralisé pour l'API worldcup26.ir
 *
 * Usage browser (use-live-scores.ts) :
 *   import { fetchGames, parseScorers } from "@/lib/worldcup26"
 *   const games = await fetchGames(process.env.NEXT_PUBLIC_WORLDCUP26_TOKEN)
 *
 * Usage server (server action / route handler) :
 *   import { fetchGames } from "@/lib/worldcup26"
 *   const games = await fetchGames(process.env.WORLDCUP26_TOKEN)
 */

export const WC26_BASE = "https://worldcup26.ir"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Match complet tel que retourné par /get/games */
export type WC26Game = {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_name_en: string
  away_team_name_en: string
  home_team_name_fa?: string
  away_team_name_fa?: string
  home_team_label?: string   // pour les matchs KO non déterminés ("Winner Match 86")
  away_team_label?: string
  home_score: string          // "0" | "null"
  away_score: string
  home_scorers: string | null
  away_scorers: string | null
  finished: string            // "TRUE" | "FALSE"
  time_elapsed: string        // "finished" | "notstarted" | minutes
  local_date: string          // "MM/DD/YYYY HH:mm" en heure locale du stade
  persian_date?: string
  stadium_id: string
  group: string               // "A"-"L", "R32", "R16", "QF", "SF", "FINAL", "3RD"
  matchday: string
  type: string                // "group" | "r32" | "r16" | "qf" | "sf" | "final" | "third"
}

export type WC26Team = {
  id: string
  name_en: string
  name_fa?: string
  fifa_code?: string
  iso2?: string
  groups?: string
  flag?: string
}

export type WC26Group = {
  name: string
  teams: WC26Team[]
}

export type WC26Scorer = {
  player: string
  minute: number
  team: string
}

export type WC26Stadium = {
  id: string
  name_en: string
  name_fa?: string
  fifa_name?: string
  city_en: string
  country_en: string
  capacity: number
  region?: string
}

// ---------------------------------------------------------------------------
// Timezone des stades (UTC offset en juin/juillet 2026)
// ---------------------------------------------------------------------------

/** UTC offset en heures pour chaque stade en juin-juillet 2026 */
const STADIUM_UTC_OFFSETS: Record<string, number> = {
  "1": -6,   // Estadio Azteca — Mexico City (UTC-6, pas de DST au Mexique)
  "2": -6,   // Estadio Akron — Guadalajara
  "3": -6,   // Estadio BBVA — Monterrey
  "4": -5,   // AT&T Stadium — Dallas (CDT)
  "5": -5,   // NRG Stadium — Houston (CDT)
  "6": -5,   // Arrowhead — Kansas City (CDT)
  "7": -4,   // Mercedes-Benz — Atlanta (EDT)
  "8": -4,   // Hard Rock — Miami (EDT)
  "9": -4,   // Gillette — Boston (EDT)
  "10": -4,  // Lincoln Financial — Philadelphia (EDT)
  "11": -4,  // MetLife — New York (EDT)
  "12": -4,  // BMO Field — Toronto (EDT)
  "13": -7,  // BC Place — Vancouver (PDT)
  "14": -7,  // Lumen Field — Seattle (PDT)
  "15": -7,  // Levi's Stadium — San Francisco (PDT)
  "16": -7,  // SoFi Stadium — Los Angeles (PDT)
}

/** Mapping stade ID → nom du stade (fallback) */
const STADIUM_NAMES: Record<string, string> = {
  "1": "Estadio Azteca, Mexico City",
  "2": "Estadio Akron, Guadalajara",
  "3": "Estadio BBVA, Monterrey",
  "4": "AT&T Stadium, Dallas",
  "5": "NRG Stadium, Houston",
  "6": "GEHA Field at Arrowhead Stadium, Kansas City",
  "7": "Mercedes-Benz Stadium, Atlanta",
  "8": "Hard Rock Stadium, Miami",
  "9": "Gillette Stadium, Boston",
  "10": "Lincoln Financial Field, Philadelphia",
  "11": "MetLife Stadium, New York/New Jersey",
  "12": "BMO Field, Toronto",
  "13": "BC Place, Vancouver",
  "14": "Lumen Field, Seattle",
  "15": "Levi's Stadium, San Francisco",
  "16": "SoFi Stadium, Los Angeles",
}

/** Retourne le nom du stade à partir de son ID. */
export function getStadiumName(stadiumId: string): string {
  return STADIUM_NAMES[stadiumId] ?? `Stadium #${stadiumId}`
}

/**
 * Convertit une date "MM/DD/YYYY HH:mm" en heure locale du stade → Date UTC.
 */
export function parseLocalDate(localDateStr: string, stadiumId: string): Date {
  // Format: "06/11/2026 13:00"
  const match = localDateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) {
    console.warn(`[wc26] Invalid local_date format: "${localDateStr}", falling back to UTC`)
    return new Date(localDateStr)
  }
  const [, month, day, year, hour, minute] = match
  const offsetHours = STADIUM_UTC_OFFSETS[stadiumId]
  if (offsetHours === undefined) {
    console.warn(`[wc26] Unknown stadium ${stadiumId}, assuming UTC for ${localDateStr}`)
    return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute))
  }

  // Construire en UTC puis soustraire l'offset :
  // local_time - offset = UTC  →  UTC = local_time - offset
  // Ex: 13:00 local à UTC-6 → 13:00 - (-6) = 19:00 UTC
  const offsetMs = offsetHours * 60 * 60 * 1000
  const localMs = Date.UTC(+year, +month - 1, +day, +hour, +minute)
  return new Date(localMs - offsetMs)
}

/**
 * Normalise le type de match WC26 → stage lisible.
 */
export function normalizeStage(group: string, type: string): string {
  const stageMap: Record<string, string> = {
    group: `Group ${group}`,
    r32: "Round of 32",
    r16: "Round of 16",
    qf: "Quarter-final",
    sf: "Semi-final",
    final: "Final",
    third: "Third place",
  }
  return stageMap[type] ?? (group || type)
}

/**
 * Normalise le statut WC26 → statut DB.
 */
export function normalizeStatus(finished: string, timeElapsed: string): "scheduled" | "live" | "finished" {
  if (finished === "TRUE" || timeElapsed === "finished") return "finished"
  if (timeElapsed === "notstarted" || timeElapsed === "") return "scheduled"
  // Si time_elapsed est un nombre → le match est en cours
  const mins = parseInt(timeElapsed, 10)
  if (!isNaN(mins) && mins > 0) return "live"
  return "scheduled"
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function buildHeaders(token?: string): HeadersInit {
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /get/games — tous les matchs (104 matchs du calendrier complet).
 * Token optionnel : fonctionne sans auth sur le tier gratuit.
 */
export async function fetchGames(token?: string): Promise<WC26Game[]> {
  const res = await fetch(`${WC26_BASE}/get/games`, {
    headers: buildHeaders(token),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`WC26 /get/games erreur HTTP ${res.status}`)
  const data = await res.json()
  return (data.games ?? []) as WC26Game[]
}

/**
 * GET /get/teams — liste des équipes participantes (48 équipes).
 */
export async function fetchTeams(token?: string): Promise<WC26Team[]> {
  const res = await fetch(`${WC26_BASE}/get/teams`, {
    headers: buildHeaders(token),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`WC26 /get/teams erreur HTTP ${res.status}`)
  const data = await res.json()
  return (data.teams ?? data ?? []) as WC26Team[]
}

/**
 * GET /get/groups — groupes avec classement.
 */
export async function fetchGroups(token?: string): Promise<WC26Group[]> {
  const res = await fetch(`${WC26_BASE}/get/groups`, {
    headers: buildHeaders(token),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`WC26 /get/groups erreur HTTP ${res.status}`)
  const data = await res.json()
  return (data.groups ?? data ?? []) as WC26Group[]
}

/**
 * GET /get/stadiums — liste des stades.
 */
export async function fetchStadiums(token?: string): Promise<WC26Stadium[]> {
  const res = await fetch(`${WC26_BASE}/get/stadiums`, {
    headers: buildHeaders(token),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`WC26 /get/stadiums erreur HTTP ${res.status}`)
  const data = await res.json()
  return (data.stadiums ?? []) as WC26Stadium[]
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Parse les chaînes de buteurs retournées par l'API.
 *
 * Formats gérés :
 *   - Tableau style Postgres : `{"J. Quiñones 9'","R. Jiménez 67'"}`
 *   - Chaîne simple : `"J. Quiñones 9'"`
 *   - JSON natif     : `["J. Quiñones 9'","R. Jiménez 67'"]`
 */
export function parseScorers(raw: string | null, team: string): WC26Scorer[] {
  if (!raw || raw === "null") return []

  try {
    // JSON natif
    if (raw.startsWith("[")) {
      const arr = JSON.parse(raw) as string[]
      return arr.flatMap(s => parseScorerEntry(s, team))
    }

    // Tableau style Postgres : {"name min'", ...}
    if (raw.startsWith("{")) {
      const cleaned = raw.replace(/^\{|\}$/g, "")
      // Split sur virgule hors guillemets
      const entries = cleaned.match(/"[^"]*"|[^,]+/g) ?? []
      return entries.flatMap(s => parseScorerEntry(s.replace(/^"|"$/g, "").trim(), team))
    }

    // Chaîne simple (éventuellement entre guillemets)
    return parseScorerEntry(raw.replace(/^"|"$/g, "").trim(), team)
  } catch {
    return []
  }
}

/** Parse une entrée individuelle : "J. Quiñones 9'" → { player, minute, team } */
function parseScorerEntry(entry: string, team: string): WC26Scorer[] {
  const cleaned = entry.trim()
  if (!cleaned) return []
  // Capture le nom et la minute (optionnellement suivie de '+N')
  const match = cleaned.match(/^(.+?)\s+(\d+)['+]?\d*\s*$/)
  if (match) {
    return [{ player: match[1].trim(), minute: parseInt(match[2], 10), team }]
  }
  // Pas de minute trouvée → on garde quand même le joueur (minute 0)
  return [{ player: cleaned, minute: 0, team }]
}
