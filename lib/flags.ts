// Country flags as emoji, keyed by team name and FIFA code.
// Covers all 48 World Cup 2026 teams.

export const FLAGS_BY_CODE: Record<string, string> = {
  ARG: "🇦🇷", AUS: "🇦🇺", AUT: "🇦🇹", BHR: "🇧🇭", BEL: "🇧🇪",
  BRA: "🇧🇷", CAN: "🇨🇦", CHI: "🇨🇱", CHN: "🇨🇳", CMR: "🇨🇲",
  COL: "🇨🇴", CRC: "🇨🇷", CRO: "🇭🇷", CZE: "🇨🇿", DEN: "🇩🇰",
  ECU: "🇪🇨", EGY: "🇪🇬", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ESP: "🇪🇸", FRA: "🇫🇷",
  GER: "🇩🇪", GHA: "🇬🇭", GRE: "🇬🇷", HON: "🇭🇳", HUN: "🇭🇺",
  IRN: "🇮🇷", IRQ: "🇮🇶", ITA: "🇮🇹", JAM: "🇯🇲", JPN: "🇯🇵",
  KOR: "🇰🇷", KSA: "🇸🇦", MAR: "🇲🇦", MEX: "🇲🇽", NED: "🇳🇱",
  NGA: "🇳🇬", NOR: "🇳🇴", NZL: "🇳🇿", PAR: "🇵🇾", POL: "🇵🇱",
  POR: "🇵🇹", QAT: "🇶🇦", ROU: "🇷🇴", RSA: "🇿🇦", SEN: "🇸🇳",
  SRB: "🇷🇸", SUI: "🇨🇭", TUN: "🇹🇳", TUR: "🇹🇷", UAE: "🇦🇪",
  UKR: "🇺🇦", URU: "🇺🇾", USA: "🇺🇸", WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  // Common abbreviations
  CIV: "🇨🇮", ALG: "🇩🇿", NGR: "🇳🇬", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  // Fallback mapping by country name
  "SOUTH KOREA": "🇰🇷", "NORTH KOREA": "🇰🇵",
}

export const FLAGS_BY_NAME: Record<string, string> = {
  "Argentina": "🇦🇷", "Australia": "🇦🇺", "Austria": "🇦🇹", "Bahrain": "🇧🇭",
  "Belgium": "🇧🇪", "Brazil": "🇧🇷", "Canada": "🇨🇦", "Chile": "🇨🇱",
  "China": "🇨🇳", "Cameroon": "🇨🇲", "Colombia": "🇨🇴", "Costa Rica": "🇨🇷",
  "Croatia": "🇭🇷", "Czech Republic": "🇨🇿", "Denmark": "🇩🇰",
  "Ecuador": "🇪🇨", "Egypt": "🇪🇬", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Spain": "🇪🇸",
  "France": "🇫🇷", "Germany": "🇩🇪", "Ghana": "🇬🇭", "Greece": "🇬🇷",
  "Honduras": "🇭🇳", "Hungary": "🇭🇺", "Iran": "🇮🇷", "Iraq": "🇮🇶",
  "Italy": "🇮🇹", "Jamaica": "🇯🇲", "Japan": "🇯🇵",
  "Korea Republic": "🇰🇷", "South Korea": "🇰🇷",
  "Saudi Arabia": "🇸🇦", "Morocco": "🇲🇦", "Mexico": "🇲🇽",
  "Netherlands": "🇳🇱", "Nigeria": "🇳🇬", "Norway": "🇳🇴",
  "New Zealand": "🇳🇿", "Paraguay": "🇵🇾", "Poland": "🇵🇱",
  "Portugal": "🇵🇹", "Qatar": "🇶🇦", "Romania": "🇷🇴",
  "South Africa": "🇿🇦", "Senegal": "🇸🇳", "Serbia": "🇷🇸",
  "Switzerland": "🇨🇭", "Tunisia": "🇹🇳", "Turkey": "🇹🇷",
  "United Arab Emirates": "🇦🇪", "Ukraine": "🇺🇦", "Uruguay": "🇺🇾",
  "United States": "🇺🇸", "USA": "🇺🇸", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Ivory Coast": "🇨🇮", "Côte d'Ivoire": "🇨🇮", "Algeria": "🇩🇿",
}

export function flagForTeam(name: string, code?: string | null): string {
  if (code && FLAGS_BY_CODE[code.toUpperCase()]) {
    return FLAGS_BY_CODE[code.toUpperCase()]
  }
  if (FLAGS_BY_NAME[name]) {
    return FLAGS_BY_NAME[name]
  }
  // Fuzzy match
  const normalized = name.toLowerCase().trim()
  for (const [key, flag] of Object.entries(FLAGS_BY_NAME)) {
    if (key.toLowerCase() === normalized) return flag
  }
  return "🏳️"
}
