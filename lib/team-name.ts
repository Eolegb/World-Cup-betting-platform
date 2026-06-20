const TEAM_ALIASES: Record<string, string> = {
  "usa": "united states",
  "u s a": "united states",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "cote d ivoire": "ivory coast",
  "cote divoire": "ivory coast",
  "czech republic": "czechia",
  "iran islamic republic of": "iran",
}

export function normalizeTeamName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return TEAM_ALIASES[cleaned] ?? cleaned
}

export function teamsMatch(left: string, right: string): boolean {
  return normalizeTeamName(left) === normalizeTeamName(right)
}
