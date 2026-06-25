import { requireUser, AppShell } from "@/components/app-shell"
import { buildBracketData, isBracketVisible, isBracketPublished } from "@/lib/bracket"
import { BracketTree } from "@/components/bracket-tree"
import { toggleBracketVisibility } from "@/app/actions/bracket"
import { BracketAdminBar } from "@/components/bracket-admin-bar"
import { Trophy, EyeOff, Eye } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function BracketPage() {
  const { profile: p } = await requireUser()

  let visible = false
  let published = false
  let bracketError = ""

  try {
    visible = await isBracketVisible(p.isAdmin)
  } catch {
    visible = p.isAdmin
  }

  try {
    published = await isBracketPublished()
  } catch {
    published = false
  }

  if (!visible) {
    return (
      <AppShell profile={p}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h1 className="font-heading text-2xl text-foreground mb-2">Bracket du tournoi</h1>
          <p className="text-muted-foreground max-w-md">
            Le tableau des phases finales sera disponible à partir du{" "}
            <strong>28 juin 2026</strong>, une fois la phase de groupes terminée.
          </p>
          {p.isAdmin && (
            <p className="mt-4 text-xs text-primary">
              En tant qu&apos;admin, tu peux publier le bracket en avance si tu veux le tester.
            </p>
          )}
        </div>
      </AppShell>
    )
  }

  // Build bracket
  let bracket
  try {
    bracket = await buildBracketData()
  } catch (e) {
    bracketError = e instanceof Error ? e.message : "Erreur inconnue"
    bracket = { left: { rounds: [] }, right: { rounds: [] }, thirdPlace: null, final: null }
  }

  // Count how many KO matches have both teams determined
  const koSlots = [
    ...bracket.left.rounds.flatMap(r => r.slots),
    ...bracket.right.rounds.flatMap(r => r.slots),
    bracket.final,
    bracket.thirdPlace,
  ].filter(Boolean) as Exclude<typeof bracket.final, null>[]

  const determined = koSlots.filter(s => s.match).length
  const total = koSlots.length

  return (
    <AppShell profile={p}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl text-foreground">Bracket du tournoi</h1>
            <p className="text-sm text-muted-foreground">
              Tableau final — {determined}/{total} matchs déterminés
            </p>
          </div>

          <div className="flex items-center gap-2">
            {p.isAdmin && <BracketAdminBar published={published} />}
            {p.isAdmin && (
              <form action={toggleBracketVisibility}>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    published
                      ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  }`}
                >
                  {published ? <><EyeOff className="h-4 w-4" /> Masquer</> : <><Eye className="h-4 w-4" /> Publier</>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bracket or error */}
        {bracketError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-400">Erreur lors du chargement du bracket :</p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">{bracketError}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Vérifie que la table <code>setting</code> existe (run <code>npx drizzle-kit push</code>).
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/40 glass p-4 sm:p-6">
            <BracketTree data={bracket} />
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gold" /> Vainqueur
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse" /> En direct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-border" /> À déterminer
          </span>
        </div>
      </div>
    </AppShell>
  )
}
