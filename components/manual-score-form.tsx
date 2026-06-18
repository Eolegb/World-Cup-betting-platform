"use client"

import { useState } from "react"
import { setMatchResult } from "@/app/actions/set-match-result"
import { toast } from "sonner"

export function ManualScoreForm({ matchId, homeTeam, awayTeam }: { matchId: number; homeTeam: string; awayTeam: string }) {
  const [open, setOpen] = useState(false)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [goals, setGoals] = useState<{ player: string; minute: number }[]>([])
  const [loading, setLoading] = useState(false)

  function addGoal() {
    setGoals([...goals, { player: "", minute: Math.max(1, ...goals.map(g => g.minute), 0) + 1 }])
  }

  function updateGoal(i: number, field: "player" | "minute", value: string) {
    const next = [...goals]
    if (field === "minute") next[i].minute = parseInt(value) || 0
    else next[i].player = value
    setGoals(next)
  }

  function removeGoal(i: number) {
    setGoals(goals.filter((_, idx) => idx !== i))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await setMatchResult(matchId, homeScore, awayScore, goals)
    if (res.ok) {
      toast.success(`${homeTeam} ${homeScore}-${awayScore} ${awayTeam} · ${res.settled} paris résolus (${res.won} gagnés, ${res.lost} perdus)`)
      setOpen(false)
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="rounded-lg border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors shrink-0">
        {open ? "Fermer" : "Score"}
      </button>
      {open && (
        <tr>
          <td colSpan={9} className="p-3 bg-secondary/20">
            <form onSubmit={submit} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-foreground">{homeTeam}</span>
                <input type="number" min={0} max={20} value={homeScore} onChange={e => setHomeScore(parseInt(e.target.value) || 0)} className="w-14 rounded-lg border border-border bg-card px-2 py-1 text-sm text-center text-foreground" />
                <span className="text-muted-foreground">-</span>
                <input type="number" min={0} max={20} value={awayScore} onChange={e => setAwayScore(parseInt(e.target.value) || 0)} className="w-14 rounded-lg border border-border bg-card px-2 py-1 text-sm text-center text-foreground" />
                <span className="text-xs text-foreground">{awayTeam}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {homeScore + awayScore > 0 && `${homeScore + awayScore} buts → ajoute ${Math.max(0, homeScore + awayScore - goals.length)} buteur(s)`}
                </span>
              </div>

              {goals.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-5">⚽</span>
                  <input
                    type="number"
                    min={1} max={120}
                    value={g.minute || ""}
                    onChange={e => updateGoal(i, "minute", e.target.value)}
                    placeholder="Min"
                    className="w-14 rounded-lg border border-border bg-card px-2 py-1 text-xs text-center text-foreground"
                  />
                  <input
                    type="text"
                    value={g.player}
                    onChange={e => updateGoal(i, "player", e.target.value)}
                    placeholder="Nom du buteur"
                    className="flex-1 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground"
                  />
                  <button type="button" onClick={() => removeGoal(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <button type="button" onClick={addGoal} className="text-[10px] text-primary hover:underline">+ Ajouter un buteur</button>
                <button type="submit" disabled={loading} className="ml-auto rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium disabled:opacity-50">
                  {loading ? "..." : `Valider & Clôturer`}
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  )
}
