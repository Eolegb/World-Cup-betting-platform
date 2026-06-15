import { requireUser, AppShell } from "@/components/app-shell"
import { getMatches } from "@/lib/queries"
import { db } from "@/lib/db"
import { user as userTable, profile } from "@/lib/db/schema"
import { Database, RefreshCw, FlaskConical, Users } from "lucide-react"
import { redirect } from "next/navigation"
import { AdminActions } from "./actions"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { user, profile: p } = await requireUser()
  if (!p.isAdmin) redirect("/")

  const matches = await getMatches()
  const totalMatches = matches.length
  const live = matches.filter((m) => m.status === "live").length
  const scheduled = matches.filter((m) => m.status === "scheduled").length
  const finished = matches.filter((m) => m.status === "finished").length

  const users = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    balance: profile.balance,
    isAdmin: profile.isAdmin,
    streak: profile.streak,
  }).from(userTable).leftJoin(profile, eq(userTable.id, profile.userId))

  return (
    <AppShell profile={p}>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl text-foreground">
          <Database className="h-5 w-5 text-primary" />
          Administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Synchronisation des données, gestion des matchs et des paris.
        </p>
      </div>

      {/* Players list */}
      <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 font-heading text-base text-card-foreground">
            <Users className="h-4 w-4 text-primary" />
            Joueurs ({users.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Nom</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Solde</th>
                <th className="hidden sm:table-cell h-10 px-4 text-left font-medium text-muted-foreground">Email</th>
                <th className="hidden sm:table-cell h-10 px-4 text-left font-medium text-muted-foreground">ID</th>
                <th className="hidden sm:table-cell h-10 px-4 text-center font-medium text-muted-foreground">Streak</th>
                <th className="hidden sm:table-cell h-10 px-4 text-center font-medium text-muted-foreground">Admin</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border transition-colors hover:bg-muted/50">
                  <td className="p-3 font-medium text-card-foreground">{u.name}</td>
                  <td className="p-3 text-right font-heading tabular text-foreground">{u.balance ?? 1000}€</td>
                  <td className="hidden sm:table-cell p-3 text-xs text-muted-foreground">{u.email}</td>
                  <td className="hidden sm:table-cell p-3 font-mono text-[10px] text-muted-foreground">{u.id}</td>
                  <td className="hidden sm:table-cell p-3 text-center">{u.streak ? `🔥 ${u.streak}` : "—"}</td>
                  <td className="hidden sm:table-cell p-3 text-center">{u.isAdmin ? "✅" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync buttons */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base text-card-foreground">
          <RefreshCw className="h-4 w-4 text-primary" />
          Synchronisation des données
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Récupère les matchs, scores et cotes depuis les API externes. Résout automatiquement les paris.
        </p>
        <AdminActions />
      </div>

      {/* Admin tools */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base text-card-foreground">
          <FlaskConical className="h-4 w-4 text-gold" />
          Outils
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/reset-balances"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            onClick={async (e) => { e.preventDefault(); if (confirm("Restaurer toutes les cagnottes à leur dernière valeur sauvegardée ?")) { const res = await fetch("/api/admin/reset-balances"); const data = await res.json(); alert(data.ok ? `${data.restored} cagnottes restaurées.` : "Erreur"); window.location.reload(); } }}
          >
            🔄 Restaurer les cagnottes
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total matchs</p>
          <p className="mt-1 font-heading text-xl tabular text-foreground">{totalMatches}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">En direct</p>
          <p className="mt-1 font-heading text-xl tabular text-live">{live}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">À venir</p>
          <p className="mt-1 font-heading text-xl tabular text-foreground">{scheduled}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Terminés</p>
          <p className="mt-1 font-heading text-xl tabular text-muted-foreground">{finished}</p>
        </div>
      </div>

      {/* Match list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-heading text-base text-card-foreground">Matchs ({totalMatches})</h2>
        </div>
        {matches.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun match. Lance une synchronisation ou génère des données de démo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">ID</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Match</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Date</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Score</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-border transition-colors hover:bg-muted/50">
                    <td className="p-4 tabular text-xs text-muted-foreground">#{m.id}</td>
                    <td className="p-4 text-card-foreground">
                      {m.homeTeam} vs {m.awayTeam}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(m.kickoff))}
                    </td>
                    <td className="p-4 text-center font-heading tabular text-card-foreground">
                      {m.status === "scheduled" ? "-" : `${m.homeScore} - ${m.awayScore}`}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === "live"
                            ? "bg-live/15 text-live"
                            : m.status === "finished"
                              ? "bg-muted text-muted-foreground"
                              : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {m.status === "live" ? "En direct" : m.status === "finished" ? "Terminé" : "À venir"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
