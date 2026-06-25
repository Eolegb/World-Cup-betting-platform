"use client"

import type { GroupStanding, GroupTeam } from "@/lib/bracket"
import { cn } from "@/lib/utils"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  qualified:  { label: "Qualifié", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  possible:   { label: "Possible", className: "bg-amber-500/10 text-amber-400/80 border-amber-500/25" },
  eliminated: { label: "Éliminé",  className: "bg-red-500/8 text-red-400/60 border-red-500/20" },
}

const POS_COLORS: Record<number, string> = {
  0: "text-emerald-400",
  1: "text-emerald-400",
  2: "text-amber-400/70",
  3: "text-muted-foreground/40",
}

function TeamRow({ team }: { team: GroupTeam }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[11px] transition-colors",
      team.position < 2 && "bg-emerald-500/5",
    )}>
      <span className={cn("w-4 text-center font-mono text-[10px] font-bold shrink-0", POS_COLORS[team.position] ?? "text-muted-foreground")}>
        {team.position + 1}
      </span>
      <span className="text-base leading-none shrink-0">{team.flag ? <img src={team.flag} alt="" className="h-4 w-5 object-cover rounded-sm" /> : <span className="inline-block w-5 h-4" />}</span>
      <span className={cn(
        "flex-1 min-w-0 truncate font-medium",
        team.position < 2 ? "text-foreground" : team.position === 2 ? "text-foreground/70" : "text-muted-foreground/50",
      )}>
        {team.name}
      </span>
      <span className="text-[10px] tabular-nums text-muted-foreground/70 w-6 text-center">{team.mp}</span>
      <span className="text-[10px] tabular-nums text-muted-foreground/70 w-6 text-center">{team.pts}</span>
      <span className={cn(
        "text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0",
        STATUS_BADGE[team.status].className,
      )}>
        {STATUS_BADGE[team.status].label}
      </span>
    </div>
  )
}

function GroupCard({ group }: { group: GroupStanding }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-2.5 min-w-[260px]">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-primary/80">Groupe {group.name}</span>
        <span className="text-[9px] text-muted-foreground/50">MJ Pts</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {group.teams.map((team) => (
          <TeamRow key={team.teamId} team={team} />
        ))}
      </div>
    </div>
  )
}

export function GroupStandings({ groups }: { groups: GroupStanding[] }) {
  if (groups.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
      {groups.map((g) => (
        <GroupCard key={g.name} group={g} />
      ))}
    </div>
  )
}
