const TEAM_ALIASES: Record<string, string> = {
  "usa": "united states",
  "u s a": "united states",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "cote d ivoire": "ivory coast",
  "cote divoire": "ivory coast",
  "czech republic": "czechia",
  "iran islamic republic of": "iran",
  "ir iran": "iran",
  "trinidad and tobago": "trinidad tobago",
  "new zealand": "new zealand",
  "saudi arabia": "saudi arabia",
  "ksa": "saudi arabia",
  "uae": "united arab emirates",
  "dr congo": "congo dr",
  "democratic republic of congo": "congo dr",
  "republic of ireland": "ireland",
}

export function normalizeTeamName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return TEAM_ALIASES[cleaned] ?? cleaned
}

export function teamsMatch(left: string, right: string): boolean {
  return normalizeTeamName(left) === normalizeTeamName(right)
}

// ---------------------------------------------------------------------------
// Player name matching
// ---------------------------------------------------------------------------

/**
 * Normalise un nom de joueur : supprime les accents, met en minuscule,
 * développe les initiales ("K." → "k"), retire la ponctuation.
 * Ex: "K. Mbappé" → "k mbappe", "Kylian Mbappé" → "kylian mbappe"
 */
export function normalizePlayerName(name: string | null | undefined): string {
  if (!name) return ""
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, " ") // "K." → "K "
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Compare deux noms de joueurs avec tolérance :
 * 1. Correspondance exacte après normalisation
 * 2. Correspondance du nom de famille (dernier mot > 3 lettres)
 *    → "k mbappe" ↔ "kylian mbappe"
 *
 * NOTE: on ne fait PAS de contains() pour éviter les faux positifs
 * ("silva" matche "thiago silva" ET "anderson silva").
 */
export function playersMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false
  const na = normalizePlayerName(a)
  const nb = normalizePlayerName(b)
  if (!na || !nb) return false

  // 1. Exact
  if (na === nb) return true

  // 2. Nom de famille (dernier token significatif)
  const sigA = na.split(" ").filter((w) => w.length > 2)
  const sigB = nb.split(" ").filter((w) => w.length > 2)
  const lastA = sigA[sigA.length - 1]
  const lastB = sigB[sigB.length - 1]
  if (lastA && lastB && lastA === lastB) return true

  return false
}
