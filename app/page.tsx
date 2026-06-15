import { requireUser, AppShell } from "@/components/app-shell"
import { getMatches, getActivityFeed } from "@/lib/queries"
import MatchCard from "@/components/match-card"
import { AutoRefresh } from "@/components/auto-refresh"
import { ActivityFeed } from "@/components/activity-feed"
import { formatMoney } from "@/lib/format"
import { Radio, CalendarClock, Flag } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { user, profile } = await requireUser()
  const matches = await getMatches()

  const live = matches.filter((m) => m.status === "live")
  const upcoming = matches.filter((m) => m.status === "scheduled")
  const finished = matches.filter((m) => m.status === "finished")

  return (
    <AppShell profile={profile}>
      {live.length > 0 && <AutoRefresh seconds={30} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <section className="mb-8 overflow-hidden rounded-3xl border border-border/60 glass-strong p-4 sm:p-6 animate-scale-in">
            <p className="text-sm text-muted-foreground">Salut {profile.displayName}</p>
            <h1 className="mt-1 font-heading text-2xl text-card-foreground text-balance sm:text-3xl">
              Place tes pronos pour la Coupe du Monde 2026
            </h1>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              Ta cagnotte actuelle est de{" "}
              <span className="font-semibold text-gold tabular">{formatMoney(profile.balance)}</span>. Mise malin, vise les
              grosses cotes et grimpe au classement.
            </p>
            {profile.streak > 0 && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                🔥 {profile.streak} victoire{profile.streak > 1 ? "s" : ""} d&apos;affilée !
              </p>
            )}
          </section>

          {matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="font-heading text-lg text-foreground">Aucun match pour le moment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les matchs apparaîtront ici dès qu&apos;ils seront synchronisés
                {profile.isAdmin ? " — rends-toi sur la page Admin pour lancer la synchro." : "."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {live.length > 0 && (
                <MatchSection title="En direct" icon={<Radio className="h-4 w-4 text-live" />} matches={live} />
              )}
              {upcoming.length > 0 && (
                <MatchSection
                  title="À venir"
                  icon={<CalendarClock className="h-4 w-4 text-primary" />}
                  matches={upcoming}
                />
              )}
              {finished.length > 0 && (
                <MatchSection title="Terminés" icon={<Flag className="h-4 w-4 text-muted-foreground" />} matches={finished} />
              )}
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <h3 className="mb-3 flex items-center gap-2 font-heading text-sm text-foreground">
              <Radio className="h-4 w-4 text-live" />
              Activité récente
            </h3>
            <ActivityFeed />
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function MatchSection({
  title,
  icon,
  matches,
}: {
  title: string
  icon: React.ReactNode
  matches: Awaited<ReturnType<typeof getMatches>>
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-heading text-lg text-foreground">
        {icon}
        {title}
        <span className="text-sm font-normal text-muted-foreground">({matches.length})</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 stagger">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  )
}
