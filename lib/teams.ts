// Demo rosters used for scorer markets before/while real lineups are available.
// Keyed by team name (as it appears in api-football). Extend freely.

export const ROSTERS: Record<string, string[]> = {
  France: ["Kylian Mbappe", "Antoine Griezmann", "Ousmane Dembele", "Marcus Thuram", "Randal Kolo Muani"],
  Argentina: ["Lionel Messi", "Julian Alvarez", "Lautaro Martinez", "Angel Di Maria", "Nicolas Gonzalez"],
  Brazil: ["Vinicius Junior", "Rodrygo", "Raphinha", "Endrick", "Gabriel Martinelli"],
  England: ["Harry Kane", "Bukayo Saka", "Phil Foden", "Jude Bellingham", "Cole Palmer"],
  Spain: ["Lamine Yamal", "Nico Williams", "Alvaro Morata", "Dani Olmo", "Mikel Oyarzabal"],
  Portugal: ["Cristiano Ronaldo", "Bruno Fernandes", "Rafael Leao", "Goncalo Ramos", "Bernardo Silva"],
  Germany: ["Kai Havertz", "Jamal Musiala", "Florian Wirtz", "Niclas Fullkrug", "Leroy Sane"],
  Netherlands: ["Memphis Depay", "Cody Gakpo", "Donyell Malen", "Xavi Simons", "Wout Weghorst"],
}

const GENERIC = ["Attaquant 9", "Attaquant 11", "Milieu 10", "Ailier 7", "Ailier 17"]

export function rosterFor(team: string): string[] {
  return ROSTERS[team] ?? GENERIC.map((g) => `${team} ${g}`)
}

export function matchRoster(homeTeam: string, awayTeam: string): string[] {
  return [...rosterFor(homeTeam), ...rosterFor(awayTeam)]
}
