import { requireUser, AppShell } from "@/components/app-shell"
import { getMatches } from "@/lib/queries"
import { MatchCard } from "@/components/match-card"
import { AutoRefresh } from "@/components/auto-refresh"
import { formatMoney } from "@/lib/format"
import { Radio, CalendarClock, Flag } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { profile } = await requireUser()
  const matches = await getMatches()

  const live = matches.filter((m) => m.status === "live")
  const upcoming = matches.filter((m) => m.status === "scheduled")
  const finished = matches.filter((m) => m.status === "finished")

  return (
    <AppShell profile={profile}>
      {live.length > 0 && <AutoRefresh seconds={30} />}

      <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Salut {profile.displayName}</p>
        <h1 className="mt-1 font-heading text-2xl text-card-foreground text-balance sm:text-3xl">
          Place tes pronos pour la Coupe du Monde 2026
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Ta cagnotte actuelle est de{" "}
          <span className="font-semibold text-gold tabular">{formatMoney(profile.balance)}</span>. Mise malin, vise les
          grosses cotes et grimpe au classement.
        </p>
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
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  )
}
