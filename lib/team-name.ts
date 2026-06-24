const TEAM_ALIASES: Record<string, string> = {
  // --- English API name disambiguations ----------------------------------
  "usa": "united states",
  "u s a": "united states",
  "korea": "south korea",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "dpr korea": "north korea",
  "korea dpr": "north korea",
  "congo": "congo dr",
  "dr congo": "congo dr",
  "congo dr": "congo dr",
  "democratic republic of congo": "congo dr",
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
  "republic of ireland": "ireland",
  "bosnia-herzegovina": "bosnia and herzegovina",
  "bosnia herzegovina": "bosnia and herzegovina",
  "bosnia": "bosnia and herzegovina",
  "turkiye": "turkey",

  // --- French → English (safety net if DB has French names) --------------
  "colombie": "colombia",
  "bresil": "brazil",
  "argentine": "argentina",
  "angleterre": "england",
  "allemagne": "germany",
  "espagne": "spain",
  "italie": "italy",
  "pays bas": "netherlands",
  "croatie": "croatia",
  "maroc": "morocco",
  "mexique": "mexico",
  "japon": "japan",
  "suisse": "switzerland",
  "danemark": "denmark",
  "serbie": "serbia",
  "suede": "sweden",
  "pologne": "poland",
  "belgique": "belgium",
  "tunisie": "tunisia",
  "cameroun": "cameroon",
  "egypte": "egypt",
  "australie": "australia",
  "coree du sud": "south korea",
  "coree du nord": "north korea",
  "nouvelle zelande": "new zealand",
  "afrique du sud": "south africa",
  "etats unis": "united states",
  "pays de galles": "wales",
  "ecosse": "scotland",
  "turquie": "turkey",
  "autriche": "austria",
  "grece": "greece",
  "norvege": "norway",
  "hongrie": "hungary",
  "roumanie": "romania",
  "republique tcheque": "czechia",
  "slovaquie": "slovakia",
  "slovenie": "slovenia",
  "bulgarie": "bulgaria",
  "portugal": "portugal",
  "france": "france",
  "uruguay": "uruguay",
  "paraguay": "paraguay",
  "chili": "chile",
  "perou": "peru",
  "equateur": "ecuador",
  "venezuela": "venezuela",
  "bolivie": "bolivia",
  "canada": "canada",
  "panama": "panama",
  "costa rica": "costa rica",
  "honduras": "honduras",
  "jamaique": "jamaica",
  "nigeria": "nigeria",
  "ghana": "ghana",
  "senegal": "senegal",
  "algerie": "algeria",
  "russie": "russia",
  "qatar": "qatar",
  "inde": "india",
  "chine": "china",
  "coree": "south korea",
  "irlande": "ireland",

  // --- Other API variants ------------------------------------------------
  "rd congo": "congo dr",
  "macedonia": "north macedonia",
  "china pr": "china",
  "hong kong china": "hong kong",
  "the gambia": "gambia",
  "south korea republic": "south korea",
  "us virgin islands": "united states virgin islands",
  "st kitts and nevis": "saint kitts and nevis",
  "st lucia": "saint lucia",
  "st vincent and the grenadines": "saint vincent and the grenadines",
  "timor leste": "east timor",
  "brunei darussalam": "brunei",
  "lao pdr": "laos",
  "syrian arab republic": "syria",
  "tanzania united republic of": "tanzania",
  "venezuela bolivarian republic of": "venezuela",
  "bolivia plurinational state of": "bolivia",
  "moldova republic of": "moldova",
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
  if (!left || !right) return false
  const a = normalizeTeamName(left)
  const b = normalizeTeamName(right)
  if (a === b) return true

  // Fuzzy fallback: token subset — handles partial matches like
  // "congo" ↔ "congo dr", "korea republic" ↔ "south korea", etc.
  // Directional qualifiers (north/south/east/west) prevent false cross-matches.
  const tokensA = a.split(" ").filter(w => w.length > 1)
  const tokensB = b.split(" ").filter(w => w.length > 1)
  if (tokensA.length === 0 || tokensB.length === 0) return false

  const allAinB = tokensA.every(t => tokensB.includes(t))
  const allBinA = tokensB.every(t => tokensA.includes(t))
  return allAinB || allBinA
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
