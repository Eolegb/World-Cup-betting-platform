"use client"

import { cn } from "@/lib/utils"
import { flagForTeam } from "@/lib/flags"
import type { TeamLineup } from "@/lib/providers"

function posLabel(pos: string): string {
  switch (pos) {
    case "G": return "G"
    case "D": return "D"
    case "M": return "M"
    case "F": return "A"
    default: return pos
  }
}

export function LineupField({ lineup, color = "#22c55e" }: { lineup: TeamLineup; color?: string }) {
  // Grid coords: grid["col:row"] → position
  // col: 1=far-left, last=far-right
  // row: 1=closest to goal (GK/DEF), last=closest to opponent (FWD)
  const byGrid = new Map<string, typeof lineup.startXI[number]>()
  for (const p of lineup.startXI) {
    if (p.grid) byGrid.set(p.grid, p)
  }

  const rows = [1, 2, 3, 4, 5]
  const maxCol = lineup.formation ? Number(lineup.formation.split("-")[0]) : 4
  const cols = Math.max(maxCol, Math.max(...lineup.startXI.map(p => {
    const parts = p.grid?.split(":")
    return parts ? Number(parts[0]) : 0
  })))

  const flag = flagForTeam(lineup.teamName)

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card">
        <span className="text-lg">{flag}</span>
        <span className="text-sm font-medium">{lineup.teamName}</span>
        <span className="ml-auto text-xs text-muted-foreground">{lineup.formation}</span>
      </div>
      <div
        className="relative p-2 sm:p-4"
        style={{
          background: `linear-gradient(180deg, ${color}11 0%, ${color}22 50%, ${color}11 100%)`,
        }}
      >
        {/* Field markings */}
        <div className="absolute inset-0 border-2 border-white/10 mx-2 my-2 rounded-sm" />
        <div className="absolute top-1/2 left-2 right-2 border-t border-white/10" />
        <div className="absolute top-1/4 bottom-1/4 left-2 w-[30%] border border-white/10 border-l-0 rounded-r-sm" />
        <div className="absolute top-1/4 bottom-1/4 right-2 w-[30%] border border-white/10 border-r-0 rounded-l-sm" />

        {/* Players grid */}
        <div className="relative" style={{ minHeight: `${rows.length * 60}px` }}>
          {rows.map(row => (
            <div key={row} className="flex justify-around py-1">
              {Array.from({ length: cols }).map((_, ci) => {
                const col = ci + 1
                const grid = `${col}:${row}`
                const player = byGrid.get(grid)

                return (
                  <div
                    key={grid}
                    className="flex flex-col items-center gap-0.5"
                    style={{ width: `${100 / cols}%` }}
                  >
                    {player ? (
                      <>
                        <div
                          className="flex items-center justify-center rounded-full text-white font-bold text-xs shrink-0"
                          style={{
                            width: 32, height: 32,
                            backgroundColor: `${color}dd`,
                            boxShadow: `0 0 8px ${color}44`,
                          }}
                        >
                          {player.number}
                        </div>
                        <span className="text-[10px] text-foreground font-medium text-center leading-tight truncate max-w-[60px]">
                          {player.name.split(" ").slice(-1)[0]}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{posLabel(player.pos)}</span>
                      </>
                    ) : (
                      <div style={{ width: 32, height: 32 }} />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Substitutes row */}
      {lineup.substitutes.length > 0 && (
        <div className="px-3 py-2 border-t border-border/40 bg-card/50">
          <p className="text-[10px] text-muted-foreground mb-1">Remplaçants</p>
          <div className="flex flex-wrap gap-1.5">
            {lineup.substitutes.slice(0, 9).map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">#{p.number}</span>
                {p.name.split(" ").slice(-1)[0]}
              </span>
            ))}
            {lineup.substitutes.length > 9 && (
              <span className="text-[10px] text-muted-foreground">+{lineup.substitutes.length - 9}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function LineupLoader({
  homeLineup,
  awayLineup,
  homeColor,
  awayColor,
}: {
  homeLineup: TeamLineup | null
  awayLineup: TeamLineup | null
  homeColor?: string
  awayColor?: string
}) {
  if (!homeLineup && !awayLineup) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {homeLineup && <LineupField lineup={homeLineup} color={homeColor ?? "#3b82f6"} />}
      {awayLineup && <LineupField lineup={awayLineup} color={awayColor ?? "#ef4444"} />}
    </div>
  )
}
