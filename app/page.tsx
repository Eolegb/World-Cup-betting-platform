import { requireUser, AppShell } from "@/components/app-shell"
import { getMatches } from "@/lib/queries"
import MatchCard from "@/components/match-card"
import { ActivityFeed } from "@/components/activity-feed"
import { Avatar } from "@/components/avatar"
import { formatMoney } from "@/lib/format"
import { Radio, CalendarClock, Flag, Zap, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return "Bonne nuit"
  if (h < 12) return "Bonjour"
  if (h < 18) return "Bon après-midi"
  return "Bonsoir"
}

export default async function DashboardPage() {
  const { user, profile } = await requireUser()
  const matches = await getMatches()

  const upcoming = matches.filter((m) => m.status === "scheduled")
  const finished = matches.filter((m) => m.status === "finished")
  const inProgress = matches.filter((m) => m.status === "live")
  const greeting = getGreeting()

  // Next match countdown
  const nextMatch = upcoming[0]
  const nextIn = nextMatch ? Math.ceil((new Date(nextMatch.kickoff).getTime() - Date.now()) / 3600000) : null

  return (
    <AppShell profile={profile}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* Welcome bento */}
          <section className="overflow-hidden rounded-3xl border border-border/40 glass-strong animate-scale-in">
            <div className="relative p-5 sm:p-6">
              {/* Subtle gradient glow */}
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />

              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <Avatar name={profile.displayName} image={user.image} size="lg" />
                  <div>
                    <p className="text-sm text-muted-foreground">{greeting}</p>
                    <h1 className="font-heading text-xl sm:text-2xl text-foreground">
                      {profile.displayName}
                      {profile.isAdmin && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Admin</span>}
                    </h1>
                    {profile.streak > 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-orange-400">
                        🔥 {profile.streak} victoire{profile.streak > 1 ? "s" : ""} d&apos;affilée
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:ml-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gold/20 bg-gold/5 p-3 text-center">
                    <Zap className="mx-auto h-4 w-4 text-gold mb-1" />
                    <p className="font-heading text-xl tabular text-gold">{formatMoney(profile.balance)}</p>
                    <p className="text-[10px] text-muted-foreground">Cagnotte</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3 text-center">
                    <span className="text-lg">{inProgress.length}</span>
                    <p className="text-[10px] text-muted-foreground">En cours</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3 text-center">
                    <span className="text-lg">{upcoming.length}</span>
                    <p className="text-[10px] text-muted-foreground">À venir</p>
                  </div>
                  {nextIn != null && (
                    <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3 text-center col-span-2 sm:col-span-3">
                      <Clock className="mx-auto h-4 w-4 text-primary mb-1" />
                      <p className="text-sm font-medium text-foreground">
                        Prochain match dans {nextIn > 24 ? `${Math.floor(nextIn / 24)}j` : `${nextIn}h`}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{nextMatch.homeTeam} vs {nextMatch.awayTeam}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
