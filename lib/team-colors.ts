// Team primary and secondary colors for card backgrounds and theming.
// Used to give each match card a distinctive visual identity.

type TeamColors = { primary: string; secondary: string; text: string }

export const TEAM_COLORS: Record<string, TeamColors> = {
  France: { primary: "#002654", secondary: "#ED2939", text: "#FFFFFF" },
  Argentina: { primary: "#75AADB", secondary: "#FFFFFF", text: "#1a1a2e" },
  Brazil: { primary: "#009C3B", secondary: "#FFDF00", text: "#002776" },
  England: { primary: "#FFFFFF", secondary: "#CE1124", text: "#1a1a2e" },
  Spain: { primary: "#C60B1E", secondary: "#FFC400", text: "#FFFFFF" },
  Portugal: { primary: "#046A38", secondary: "#DA291C", text: "#FFD700" },
  Germany: { primary: "#000000", secondary: "#DD0000", text: "#FFCC00" },
  Netherlands: { primary: "#F36C21", secondary: "#FFFFFF", text: "#1a1a2e" },
  Italy: { primary: "#0066CC", secondary: "#FFFFFF", text: "#1a1a2e" },
  Mexico: { primary: "#006847", secondary: "#CE1126", text: "#FFFFFF" },
  Belgium: { primary: "#E60000", secondary: "#FFD700", text: "#000000" },
  Croatia: { primary: "#DF0000", secondary: "#FFFFFF", text: "#171796" },
  Uruguay: { primary: "#87CEEB", secondary: "#000000", text: "#FFD700" },
  Morocco: { primary: "#C1272D", secondary: "#006233", text: "#FFFFFF" },
  Japan: { primary: "#020270", secondary: "#FFFFFF", text: "#DC143C" },
  Senegal: { primary: "#006B3F", secondary: "#FFD700", text: "#E31B23" },
  USA: { primary: "#002868", secondary: "#BF0A30", text: "#FFFFFF" },
  "United States": { primary: "#002868", secondary: "#BF0A30", text: "#FFFFFF" },
  "Korea Republic": { primary: "#CD2E3A", secondary: "#0047A0", text: "#FFFFFF" },
  "South Korea": { primary: "#CD2E3A", secondary: "#0047A0", text: "#FFFFFF" },
  Canada: { primary: "#FF0000", secondary: "#FFFFFF", text: "#1a1a2e" },
  Ecuador: { primary: "#FFDD00", secondary: "#034EA2", text: "#ED1B24" },
  Qatar: { primary: "#8D1B3D", secondary: "#FFFFFF", text: "#1a1a2e" },
  Australia: { primary: "#FFD700", secondary: "#006400", text: "#1a1a2e" },
  Denmark: { primary: "#C60C30", secondary: "#FFFFFF", text: "#1a1a2e" },
  Switzerland: { primary: "#FF0000", secondary: "#FFFFFF", text: "#1a1a2e" },
  Sweden: { primary: "#005B99", secondary: "#FFD700", text: "#FFFFFF" },
  Poland: { primary: "#FFFFFF", secondary: "#DC143C", text: "#1a1a2e" },
  Serbia: { primary: "#C6363C", secondary: "#1C52A3", text: "#FFFFFF" },
  Cameroon: { primary: "#007A5E", secondary: "#FFD100", text: "#CE1126" },
  Ghana: { primary: "#FFFFFF", secondary: "#000000", text: "#CE1126" },
  Tunisia: { primary: "#E70013", secondary: "#FFFFFF", text: "#1a1a2e" },
  "Saudi Arabia": { primary: "#006C35", secondary: "#FFFFFF", text: "#1a1a2e" },
  Egypt: { primary: "#CE1126", secondary: "#FFFFFF", text: "#000000" },
  Nigeria: { primary: "#008751", secondary: "#FFFFFF", text: "#1a1a2e" },
  Algeria: { primary: "#FFFFFF", secondary: "#006233", text: "#D21034" },
  Chile: { primary: "#D72B1F", secondary: "#0039A6", text: "#FFFFFF" },
  Colombia: { primary: "#FFD700", secondary: "#003893", text: "#CE1126" },
  Peru: { primary: "#FFFFFF", secondary: "#D91023", text: "#1a1a2e" },
  Paraguay: { primary: "#FFFFFF", secondary: "#D52B1E", text: "#003087" },
  "South Africa": { primary: "#FFB81C", secondary: "#006400", text: "#1a1a2e" },
  Norway: { primary: "#BA0C2F", secondary: "#00205B", text: "#FFFFFF" },
  Ukraine: { primary: "#0057B8", secondary: "#FFD700", text: "#FFFFFF" },
  Turkey: { primary: "#E30A17", secondary: "#FFFFFF", text: "#1a1a2e" },
  Romania: { primary: "#FFD700", secondary: "#002B7F", text: "#CE1126" },
  Greece: { primary: "#004C97", secondary: "#FFFFFF", text: "#1a1a2e" },
  "Czech Republic": { primary: "#D7141A", secondary: "#11457E", text: "#FFFFFF" },
  Hungary: { primary: "#CD2A3E", secondary: "#436F4D", text: "#FFFFFF" },
  Austria: { primary: "#ED2939", secondary: "#FFFFFF", text: "#1a1a2e" },
}

const DEFAULT_COLORS: TeamColors = { primary: "#1e293b", secondary: "#334155", text: "#FFFFFF" }

export function teamColors(name: string): TeamColors {
  if (TEAM_COLORS[name]) return TEAM_COLORS[name]
  // Try fuzzy match
  const lower = name.toLowerCase().trim()
  for (const [key, colors] of Object.entries(TEAM_COLORS)) {
    if (key.toLowerCase() === lower) return colors
  }
  return DEFAULT_COLORS
}

export function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
}
