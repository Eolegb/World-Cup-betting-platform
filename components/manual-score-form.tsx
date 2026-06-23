"use client"

import { useState } from "react"
import { setMatchResult } from "@/app/actions/set-match-result"
import { toast } from "sonner"
import { X, Plus, Check } from "lucide-react"

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

  function handleClose() {
    setOpen(false)
    setHomeScore(0)
    setAwayScore(0)
    setGoals([])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await setMatchResult(matchId, homeScore, awayScore, goals)
    if (res.ok) {
      toast.success(`${homeTeam} ${homeScore}-${awayScore} ${awayTeam} · ${res.settled} paris résolus`)
      handleClose()
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        ⚽ Score
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-heading text-base text-foreground">Saisir le score</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{homeTeam} vs {awayTeam}</p>
              </div>
              <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 space-y-5">
              {/* Score */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-xs font-medium text-muted-foreground truncate w-full text-center">{homeTeam}</span>
                  <input
                    type="number" min={0} max={20} value={homeScore}
                    onChange={e => setHomeScore(parseInt(e.target.value) || 0)}
                    className="w-20 h-14 rounded-xl border border-border bg-background text-center text-2xl font-heading font-bold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <span className="text-2xl font-heading text-muted-foreground pb-4">—</span>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-xs font-medium text-muted-foreground truncate w-full text-center">{awayTeam}</span>
                  <input
                    type="number" min={0} max={20} value={awayScore}
                    onChange={e => setAwayScore(parseInt(e.target.value) || 0)}
                    className="w-20 h-14 rounded-xl border border-border bg-background text-center text-2xl font-heading font-bold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Goals */}
              {goals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Buteurs</p>
                  {goals.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm">⚽</span>
                      <input
                        type="number" min={1} max={120} value={g.minute || ""}
                        onChange={e => updateGoal(i, "minute", e.target.value)}
                        placeholder="Min"
                        className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center text-foreground focus:border-primary focus:outline-none"
                      />
                      <input
                        type="text" value={g.player}
                        onChange={e => updateGoal(i, "player", e.target.value)}
                        placeholder="Nom du buteur"
                        className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                      <button type="button" onClick={() => removeGoal(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hint */}
              {homeScore + awayScore > 0 && goals.length < homeScore + awayScore && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {homeScore + awayScore - goals.length} buteur(s) non renseigné(s) — des placeholders seront générés
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center gap-3">
                <button
                  type="button" onClick={addGoal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Buteur
                </button>
                <button
                  type="submit" disabled={loading}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? "..." : (
                    <><Check className="h-3.5 w-3.5" /> Valider & Clôturer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
