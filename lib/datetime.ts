// =============================================================================
// Date/time helpers — project convention: kickoff is stored as UTC in DB.
// =============================================================================

/** Parse a kickoff value from DB (Date or string) as UTC. */
export function utcDate(kickoff: Date | string): Date {
  if (kickoff instanceof Date) return kickoff
  // PostgreSQL returns timestamp without tz; interpret as UTC
  return new Date(kickoff + "Z")
}

/** Format a date for display in fr-FR (Paris time). */
export function formatKickoff(kickoff: Date | string, format: Intl.DateTimeFormatOptions = {}): string {
  return utcDate(kickoff).toLocaleString("fr-FR", { timeZone: "Europe/Paris", ...format })
}

/** Short format: "mer. 17 juin, 20:00" */
export function kickoffLabelShort(kickoff: Date | string): string {
  return formatKickoff(kickoff, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** Full format: "mercredi 17 juin 2026, 20:00" */
export function kickoffLabelFull(kickoff: Date | string): string {
  return formatKickoff(kickoff, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Time only: "20:00" */
export function kickoffTime(kickoff: Date | string): string {
  return formatKickoff(kickoff, { hour: "2-digit", minute: "2-digit" })
}

/** Date only: "mer. 17 juin" */
export function kickoffDate(kickoff: Date | string): string {
  return formatKickoff(kickoff, { weekday: "short", day: "numeric", month: "short" })
}
