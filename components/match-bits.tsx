import { cn } from "@/lib/utils"

export function LiveBadge({ elapsed }: { elapsed?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-xs font-semibold text-live">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
      {elapsed != null ? `${elapsed}'` : "LIVE"}
    </span>
  )
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    finished: "bg-muted text-muted-foreground",
    scheduled: "bg-secondary text-secondary-foreground",
  }
  const label = status === "finished" ? "Terminé" : "À venir"
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[status] ?? map.scheduled, className)}>
      {label}
    </span>
  )
}

export function TeamCode({ code, name }: { code?: string | null; name: string }) {
  const initials = code ?? name.slice(0, 3).toUpperCase()
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary font-heading text-xs text-secondary-foreground">
      {initials}
    </span>
  )
}
