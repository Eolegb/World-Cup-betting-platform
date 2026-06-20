import { db } from "@/lib/db"
import { activityFeed, profile, user } from "@/lib/db/schema"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { desc, eq, ne } from "drizzle-orm"

function relativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 10) return "à l'instant"
  if (diffSecs < 60) return `il y a ${diffSecs}s`
  if (diffMins < 60) return `il y a ${diffMins} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays < 7) return `il y a ${diffDays}j`
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
}

type ActivityRow = {
  id: number
  userId: string
  type: string
  message: string
  matchId: number | null
  betId: number | null
  metadata: unknown
  createdAt: Date
  displayName: string
  avatarColor: string
  image: string | null
}

async function getRecentActivity(): Promise<ActivityRow[]> {
  return db
    .select({
      id: activityFeed.id,
      userId: activityFeed.userId,
      type: activityFeed.type,
      message: activityFeed.message,
      matchId: activityFeed.matchId,
      betId: activityFeed.betId,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
      displayName: profile.displayName,
      avatarColor: profile.avatarColor,
      image: user.image,
    })
    .from(activityFeed)
    .innerJoin(profile, eq(activityFeed.userId, profile.userId))
    .innerJoin(user, eq(activityFeed.userId, user.id))
    .where(ne(activityFeed.type, "push_reminder"))
    .orderBy(desc(activityFeed.createdAt))
    .limit(20)
}

export async function ActivityFeed() {
  let activities: ActivityRow[]
  try {
    activities = await getRecentActivity()
  } catch {
    return null
  }

  if (!activities.length) {
    return (
      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-muted-foreground">Activité récente</span>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <span className="text-sm font-medium">Activité récente</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {activities.map((a, i) => (
          <div key={a.id}>
            {i > 0 && <Separator className="my-2" />}
            <div className="flex items-start gap-3 py-1">
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback style={{ backgroundColor: a.avatarColor }}>
                  {a.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-card-foreground">
                  <span className="font-medium">{a.displayName}</span>{" "}
                  <span className="text-muted-foreground">{a.message}</span>
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {relativeTime(new Date(a.createdAt))}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
