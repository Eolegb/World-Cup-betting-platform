"use client"

import type { GroupStanding, GroupTeam } from "@/lib/bracket"
import { cn } from "@/lib/utils"

const STATUS_DOT: Record<string, string> = {
  qualified:  "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]",
  possible:   "bg-amber-400/70",
  eliminated: "bg-red-400/30",
}

const POS_RING: Record<number, string> = {
  0: "text-emerald-400 border-emerald-500/40",
  1: "text-emerald-400 border-emerald-500/40",
  2: "text-amber-400/60 border-amber-500/25",
  3: "text-muted-foreground/30 border-muted/20",
}

function TeamRow({ team }: { team: GroupTeam }) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] border-b border-border/20 last:border-0">
      <span className={cn(
        "w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center shrink-0",
        POS_RING[team.position] ?? "text-muted-foreground/30 border-muted/20",
      )}>
        {team.position + 1}
      </span>
      <span className="text-xs shrink-0">{team.flag ? <img src={team.flag} alt="" className="h-3.5 w-5 object-cover rounded-sm" /> : <span className="inline-block w-5 h-3.5" />}</span>
      <span className={cn(
        "flex-1 min-w-0 truncate text-[11px]",
        team.position < 2 ? "font-semibold text-foreground" : team.position === 2 ? "text-foreground/60" : "text-muted-foreground/40",
      )}>
        {team.name}
      </span>
      <span className="w-5 text-center tabular-nums text-[10px] text-muted-foreground/60">{team.mp}</span>
      <span className="w-5 text-center tabular-nums text-[10px] text-muted-foreground/60">{team.w}</span>
      <span className="w-5 text-center tabular-nums text-[10px] text-muted-foreground/60">{team.d}</span>
      <span className="w-5 text-center tabular-nums text-[10px] text-muted-foreground/60">{team.l}</span>
      <span className="w-7 text-center tabular-nums text-[10px] text-muted-foreground/60">{team.gf}:{team.ga}</span>
      <span className={cn(
        "w-6 text-center tabular-nums text-[11px] font-bold shrink-0",
        team.position < 2 ? "text-foreground" : team.position === 2 ? "text-foreground/70" : "text-muted-foreground/40",
      )}>
        {team.pts}
      </span>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[team.status])} />
    </div>
  )
}

function GroupCard({ group }: { group: GroupStanding }) {
  const finished = group.teams.every(t => t.mp === 3)
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-2 min-w-[310px]">
      <div className={cn(
        "flex items-center gap-2 mb-1 px-1.5",
        finished && "opacity-80",
      )}>
        <span className="text-xs font-bold uppercase tracking-wider text-primary/70">
          Gr. {group.name}
        </span>
        {finished && <span className="text-[9px] text-muted-foreground/40">Terminé</span>}
      </div>
      {/* Column headers */}
      <div className="flex items-center gap-1.5 px-1 pb-0.5 border-b border-border/10 mb-0.5 text-[8px] uppercase tracking-wider text-muted-foreground/30">
        <span className="w-5 shrink-0" />
        <span className="w-5 shrink-0" />
        <span className="flex-1" />
        <span className="w-5 text-center">MJ</span>
        <span className="w-5 text-center">V</span>
        <span className="w-5 text-center">N</span>
        <span className="w-5 text-center">D</span>
        <span className="w-7 text-center">BP:BC</span>
        <span className="w-6 text-center">Pts</span>
        <span className="w-1.5 shrink-0" />
      </div>
      <div className="flex flex-col">
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {groups.map((g) => (
        <GroupCard key={g.name} group={g} />
      ))}
    </div>
  )
}
