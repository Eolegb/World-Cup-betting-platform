import { requireUser, AppShell } from "@/components/app-shell"
import { buildBracketData, isBracketVisible, isBracketPublished, BRACKET_PUBLIC_DATE, setBracketVisibility } from "@/lib/bracket"
import { BracketTree } from "@/components/bracket-tree"
import { revalidatePath } from "next/cache"
import { Trophy, EyeOff, Eye } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function BracketPage() {
  const { profile: p } = await requireUser()
  const visible = await isBracketVisible(p.isAdmin)
  const published = await isBracketPublished()

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

  const bracket = await buildBracketData()
  const rounds = bracket.rounds

  return (
    <AppShell profile={p}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-foreground">Bracket du tournoi</h1>
            <p className="text-sm text-muted-foreground">
              Tableau des phases finales — Coupe du Monde 2026
            </p>
          </div>

          {p.isAdmin && (
            <form action={async () => {
              "use server"
              await setBracketVisibility(!published)
              revalidatePath("/bracket")
            }}>
              <button
                type="submit"
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  published
                    ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                }`}
              >
                {published ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Masquer le bracket
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Publier le bracket
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Bracket */}
        <div className="rounded-2xl border border-border/40 glass p-4 sm:p-6">
          <BracketTree data={bracket} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gold" /> Vainqueur
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse" /> En direct
          </span>
        </div>
      </div>
    </AppShell>
  )
}
