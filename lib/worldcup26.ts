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

export type WC26Game = {
  id: string
  home_team_name_en: string
  away_team_name_en: string
  home_score: string    // "0" | "null"
  away_score: string
  home_scorers: string | null // e.g. `{"J. Quiñones 9'","R. Jiménez 67'"}` or plain string
  away_scorers: string | null
  finished: string      // "TRUE" | "FALSE"
  time_elapsed: string  // minutes as string or ""
  local_date: string    // ISO-like date string
}

export type WC26Team = {
  id: string
  name_en: string
  name_fa?: string
  group?: string
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
 * GET /get/games — tous les matchs avec scores et buteurs en direct.
 * Token optionnel : fonctionne sans auth sur le tier gratuit.
 */
export async function fetchGames(token?: string): Promise<WC26Game[]> {
  const res = await fetch(`${WC26_BASE}/get/games`, {
    headers: buildHeaders(token),
    // pas de cache côté serveur pour toujours avoir les données fraîches
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`WC26 /get/games erreur HTTP ${res.status}`)
  const data = await res.json()
  return (data.games ?? []) as WC26Game[]
}

/**
 * GET /get/teams — liste des équipes participantes.
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
 * GET /get/groups — groupes avec équipes.
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
