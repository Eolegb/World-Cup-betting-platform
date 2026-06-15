import { requireUser, AppShell } from "@/components/app-shell"
import { getLeaderboard, getStreakLeaderboard } from "@/lib/queries"
import { LeaderboardEnhanced } from "@/components/leaderboard-enhanced"
import { Crown } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  const { user, profile: me } = await requireUser()
  const rows = await getLeaderboard()

  return (
    <AppShell profile={me}>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl text-foreground">
          <Crown className="h-5 w-5 text-gold" />
          Classement
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les meilleurs pronostiqueurs de la ligue.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Crown className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-heading text-lg text-foreground">Aucun joueur pour le moment</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Le classement apparaîtra dès que des paris seront placés.
          </p>
        </div>
      ) : (
        <LeaderboardEnhanced rows={rows} myUserId={user.id} />
      )}
    </AppShell>
  )
}
