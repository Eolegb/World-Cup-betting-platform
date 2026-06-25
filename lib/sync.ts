import { db } from "@/lib/db"
import { match, matchEvent } from "@/lib/db/schema"
import {
  fetchFixtures,
  fetchLiveFixtures,
  fetchFixtureEvents,
  fetchMatchDetail,
  type FootballDataMatch,
  type FootballDataEvent,
} from "@/lib/providers"
import {
  fetchGames,
  parseLocalDate,
  normalizeStage,
  normalizeStatus,
  getStadiumName,
  type WC26Game,
} from "@/lib/worldcup26"
import { updateAllOdds } from "@/lib/odds-service"
import { settlePendingBetsForMatch } from "@/lib/settle-match"
import { and, eq, lt, or } from "drizzle-orm"

let syncing = false

export async function runSync(): Promise<{ ok: boolean; results?: string[]; error?: string }> {
  if (syncing) {
    return { ok: true, results: ["Sync already in progress"] }
  }

  syncing = true
  try {
    const results: string[] = []

    // 0. Sync fixtures from worldcup26.ir (calendrier complet — 104 matchs)
    try {
      const wc26Count = await syncWC26Fixtures()
      if (wc26Count > 0) results.push(`WC26: ${wc26Count} matches synced from worldcup26.ir`)
    } catch (e) {
      console.error("[sync] WC26 fixture sync error:", e)
    }

    const fixtures = await fetchFixtures(true) // force refresh
    if (fixtures.length > 0) {
      await syncFixtures(fixtures)
      results.push(`Synced ${fixtures.length} fixtures`)
    } else {
      results.push("No fixtures from API (cached or unavailable)")
    }

    const liveFixtures = await fetchLiveFixtures()
    if (liveFixtures.length > 0) {
      await syncLiveFixtures(liveFixtures)
      results.push(`Updated ${liveFixtures.length} live fixtures`)
    }

    // Detect finished matches (kickoff + 95 min, still "scheduled")
    const cutoff = new Date(Date.now() - 95 * 60 * 1000)
    const candidates = await db.select().from(match).where(and(or(eq(match.status, "scheduled"), eq(match.status, "live")), lt(match.kickoff, cutoff)))

    let eventsCount = 0
    let settledCount = 0
    for (const m of candidates) {
      if (!m.externalId) continue
      const detail = await fetchMatchDetail(m.externalId)
      if (!detail) continue
      const isFinished = detail.status === "FINISHED" ||
        (detail.score.fullTime.home != null && detail.score.fullTime.away != null)
      if (!isFinished) continue

      const homeScore = detail.score.fullTime.home ?? 0
      const awayScore = detail.score.fullTime.away ?? 0
      await db.update(match).set({ status: "finished", homeScore, awayScore, elapsed: 90, lastSyncedAt: new Date() }).where(eq(match.id, m.id))

      if (detail.goals) {
        for (const g of detail.goals) {
          await db.insert(matchEvent).values({ matchId: m.id, type: "goal", detail: g.type ?? "REGULAR", player: g.scorer?.name ?? null, team: g.team?.name ?? "", minute: g.minute, extraMinute: g.extraTime }).onConflictDoNothing()
          eventsCount++
        }
      }
      const summary = await settlePendingBetsForMatch(m.id)
      settledCount += summary.settled
    }
    if (eventsCount > 0) results.push(`Synced ${eventsCount} events`)
    if (settledCount > 0) results.push(`Settled ${settledCount} bets`)

    // Also settle any already-finished matches with pending bets
    const finishedMatches = await db.select().from(match).where(eq(match.status, "finished"))
    for (const m of finishedMatches) {
      const summary = await settlePendingBetsForMatch(m.id)
      settledCount += summary.settled
    }

    // Sync odds
    const oddsResult = await updateAllOdds()
    if (oddsResult.ok) {
      results.push(`Synced odds for ${oddsResult.stored} matches`)
    } else {
      results.push("No odds from API")
    }

    return { ok: true, results }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return { ok: false, error: msg }
  } finally {
    syncing = false
  }
}

function mapStatus(fdStatus: string): string {
  switch (fdStatus) {
    case "FINISHED":
      return "finished"
    case "LIVE":
    case "IN_PLAY":
    case "PAUSED":
      return "live"
    default:
      return "scheduled" // LIVE, IN_PLAY, PAUSED, TIMED, SCHEDULED → all "scheduled"
  }
}

function calculateElapsed(kickoff: Date): number | null {
  const now = new Date()
  const diffMs = now.getTime() - kickoff.getTime()
  if (diffMs < 0) return null
  const minutes = Math.floor(diffMs / 60000)
  return Math.min(minutes, 120) // Cap at 120
}

async function syncFixtures(fixtures: FootballDataMatch[]) {
  for (const f of fixtures) {
    const home = f.homeTeam.name
    const away = f.awayTeam.name
    if (!home || !away) continue // Skip TBD matches (knockout not yet determined)

    const extId = f.id
    const kickoffStr = f.utcDate // UTC ISO string from API
    const kickoff = new Date(kickoffStr)
    const stage = f.group ?? f.stage ?? null
    const venue = f.venue ?? null
    const status = mapStatus(f.status)
    const elapsed = status === "live" ? calculateElapsed(kickoff) : null
    const homeScore = f.score.fullTime.home ?? 0
    const awayScore = f.score.fullTime.away ?? 0

    await db
      .insert(match)
      .values({
        externalId: extId,
        homeTeam: home,
        awayTeam: away,
        homeTeamCode: f.homeTeam.tla ?? home.slice(0, 3).toUpperCase(),
        awayTeamCode: f.awayTeam.tla ?? away.slice(0, 3).toUpperCase(),
        kickoff,
        stage,
        venue,
        status,
        elapsed,
        homeScore,
        awayScore,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: match.externalId,
        set: {
          status,
          elapsed,
          homeScore,
          awayScore,
          lastSyncedAt: new Date(),
        },
      })
  }
}

async function syncLiveFixtures(fixtures: FootballDataMatch[]) {
  for (const f of fixtures) {
    const extId = f.id
    const status = mapStatus(f.status)
    const kickoff = new Date(f.utcDate)
    const elapsed = calculateElapsed(kickoff)
    const homeScore = f.score.fullTime.home ?? 0
    const awayScore = f.score.fullTime.away ?? 0

    await db
      .update(match)
      .set({
        status,
        elapsed,
        homeScore,
        awayScore,
        lastSyncedAt: new Date(),
      })
      .where(eq(match.externalId, extId))
  }
}

async function syncEvents(matchId: number, apiEvents: FootballDataEvent[]) {
  for (const e of apiEvents) {
    const type = e.type === "Goal" ? "goal" : e.type === "Card" ? "card" : "var"
    await db
      .insert(matchEvent)
      .values({
        matchId,
        type,
        detail: e.detail ?? e.type,
        player: e.scorer?.name ?? null,
        team: e.team.name,
        minute: e.minute,
        extraMinute: e.extraTime,
      })
      .onConflictDoNothing()
  }
}

// =============================================================================
// WC26 fixture sync — calendrier complet depuis worldcup26.ir
// =============================================================================

/** Préfixe pour les externalId WC26 afin d'éviter les collisions avec football-data.org */
const WC26_ID_PREFIX = 2_000_000_000

function wc26ExternalId(gameId: string): number {
  return WC26_ID_PREFIX + parseInt(gameId, 10)
}

/**
 * Sync tous les matchs depuis worldcup26.ir.
 * Retourne le nombre de matchs synchronisés.
 * Évite les doublons avec les matchs déjà existants (football-data.org etc.)
 */
async function syncWC26Fixtures(): Promise<number> {
  let games: WC26Game[]
  try {
    games = await fetchGames()
  } catch (e) {
    console.error("[sync] Failed to fetch WC26 games:", e)
    return 0
  }

  if (!games.length) {
    console.warn("[sync] WC26 returned 0 games")
    return 0
  }

  // Charger tous les matchs existants pour détecter les doublons
  const allExisting = await db
    .select({
      id: match.id,
      externalId: match.externalId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: match.kickoff,
      status: match.status,
    })
    .from(match)

  // Index par externalId WC26 pour lookup rapide
  const byExternalId = new Map<number, typeof allExisting[0]>()
  for (const m of allExisting) {
    if (m.externalId) byExternalId.set(m.externalId, m)
  }

  // Fonction utilitaire : trouver un match existant avec les mêmes équipes (±1 jour)
  function findDuplicate(home: string, away: string, kickoff: Date): typeof allExisting[0] | undefined {
    const kickoffMs = kickoff.getTime()
    const oneDay = 24 * 60 * 60 * 1000
    return allExisting.find(m => {
      if (Math.abs(m.kickoff.getTime() - kickoffMs) > oneDay) return false
      return (
        (m.homeTeam === home && m.awayTeam === away) ||
        // Fuzzy: swap home/away (les APIs peuvent inverser)
        (m.homeTeam === away && m.awayTeam === home)
      )
    })
  }

  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const g of games) {
    // Ignorer les matchs sans équipes déterminées (labels uniquement)
    if (
      (!g.home_team_name_en && g.home_team_label) ||
      (!g.away_team_name_en && g.away_team_label)
    ) {
      skipped++
      continue
    }
    if (!g.home_team_name_en || !g.away_team_name_en) {
      skipped++
      continue
    }

    const extId = wc26ExternalId(g.id)
    const kickoff = parseLocalDate(g.local_date, g.stadium_id)
    const stage = normalizeStage(g.group, g.type)
    const venue = getStadiumName(g.stadium_id)
    const status = normalizeStatus(g.finished, g.time_elapsed)
    const homeScore = g.home_score === "null" || g.home_score === "" ? 0 : parseInt(g.home_score, 10)
    const awayScore = g.away_score === "null" || g.away_score === "" ? 0 : parseInt(g.away_score, 10)

    // 1. Chercher par externalId WC26
    const existingByExtId = byExternalId.get(extId)
    if (existingByExtId) {
      const existingStatus = existingByExtId.status
      if (existingStatus === "finished" && status === "scheduled") continue
      if (existingStatus === "live" && status === "scheduled") continue

      await db
        .update(match)
        .set({ homeScore, awayScore, status, lastSyncedAt: new Date() })
        .where(eq(match.id, existingByExtId.id))
      updated++
      continue
    }

    // 2. Chercher un doublon par équipes (même match d'une autre source)
    const dup = findDuplicate(g.home_team_name_en, g.away_team_name_en, kickoff)
    if (dup) {
      // Mettre à jour le match existant avec l'externalId WC26 pour les futures synchros
      await db
        .update(match)
        .set({
          externalId: extId,
          kickoff,     // WC26 a potentiellement un meilleur horaire
          stage: stage || undefined,
          venue: venue || undefined,
          homeScore,
          awayScore,
          status: status === "finished" || dup.status !== "finished" ? status : dup.status,
          lastSyncedAt: new Date(),
        })
        .where(eq(match.id, dup.id))
      updated++
      continue
    }

    // 3. Nouveau match
    await db.insert(match).values({
      externalId: extId,
      homeTeam: g.home_team_name_en,
      awayTeam: g.away_team_name_en,
      homeTeamCode: null,
      awayTeamCode: null,
      kickoff,
      stage,
      venue,
      status,
      homeScore,
      awayScore,
      lastSyncedAt: new Date(),
    })
    inserted++
  }

  console.log(`[sync] WC26: inserted ${inserted}, updated ${updated}, skipped ${skipped} (total ${games.length} games)`)
  return inserted + updated
}
