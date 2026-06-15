"use client"

import { Avatar } from "@/components/avatar"
import { formatMoney } from "@/lib/format"
import { getBadgeEmoji } from "@/lib/gamification"
import type { LeaderRow } from "@/lib/queries"

export function LeaderboardEnhanced({
  rows,
  myUserId,
}: {
  rows: LeaderRow[]
  myUserId: string
}) {
  if (!rows.length) return null

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <>
      <style>{`
        @keyframes podium-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3) translateY(40px); }
          50% { transform: scale(1.08) translateY(-4px); }
          70% { transform: scale(0.95) translateY(2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .podium-1 { animation: podium-in 0.5s 0.1s ease-out both; }
        .podium-2 { animation: podium-in 0.5s 0s ease-out both; }
        .podium-3 { animation: podium-in 0.5s 0.2s ease-out both; }
      `}</style>

      {/* Podium - mobile: stacked 1st full-width, 2nd+3rd side by side */}
      <div className="sm:hidden mb-8 flex flex-col gap-3">
        {top3[0] && <PodiumCard rank={1} row={top3[0]} isMe={top3[0].userId === myUserId} height="h-36" isFirst />}
        {top3.length > 1 && (
          <div className="grid grid-cols-2 gap-3">
            {top3[1] && <PodiumCard rank={2} row={top3[1]} isMe={top3[1].userId === myUserId} height="h-32" />}
            {top3[2] && <PodiumCard rank={3} row={top3[2]} isMe={top3[2].userId === myUserId} height="h-28" />}
          </div>
        )}
      </div>

      {/* Podium - desktop: 3 columns */}
      <div className="hidden sm:grid mb-8 grid-cols-3 items-end gap-2 sm:gap-4">
        {top3[1] && <PodiumCard rank={2} row={top3[1]} isMe={top3[1]?.userId === myUserId} className="podium-2" height="h-40 sm:h-48" />}
        {top3[0] && <PodiumCard rank={1} row={top3[0]} isMe={top3[0]?.userId === myUserId} className="podium-1" height="h-48 sm:h-56" isFirst />}
        {top3[2] && <PodiumCard rank={3} row={top3[2]} isMe={top3[2]?.userId === myUserId} className="podium-3" height="h-32 sm:h-40" />}
      </div>

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="h-9 px-3 text-left font-medium text-muted-foreground text-xs">#</th>
                  <th className="h-9 px-3 text-left font-medium text-muted-foreground text-xs">Joueur</th>
                  <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">Solde</th>
                  <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">G/P</th>
                  <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">Série</th>
                  <th className="h-9 px-3 text-right font-medium text-muted-foreground text-xs">Badges</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r, i) => {
                  const rank = i + 4
                  const isMe = r.userId === myUserId
                  return (
                    <tr
                      key={r.userId}
                      className={`border-b border-border transition-colors hover:bg-muted/50 ${
                        isMe ? "bg-gold/5" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-heading tabular text-xs text-muted-foreground">
                        #{rank}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={r.displayName}
                            image={r.image}
                            avatarColor={r.avatarColor}
                            size="sm"
                          />
                          <span className={`text-xs font-medium truncate max-w-[120px] ${isMe ? "text-gold" : "text-card-foreground"}`}>
                            {r.displayName}
                            {isMe && <span className="ml-1 text-[9px] text-gold">(toi)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-heading tabular text-xs text-card-foreground">
                        {formatMoney(r.balance)}
                      </td>
                      <td className="px-3 py-2 text-right tabular text-xs">
                        <span className="text-primary">{r.won}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-destructive">{r.lost}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular text-xs">
                        {r.streak > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-orange-400">
                            🔥{r.streak}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular text-xs">
                        {r.badges.length > 0 ? (
                          <span className="inline-flex gap-0.5">
                            {r.badges.slice(0, 3).map((b) => (
                              <span key={b} title={b}>{getBadgeEmoji(b)}</span>
                            ))}
                            {r.badges.length > 3 && (
                              <span className="text-muted-foreground">+{r.badges.length - 3}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function PodiumCard({
  rank,
  row,
  isMe,
  className,
  height,
  isFirst,
}: {
  rank: number
  row: LeaderRow | undefined
  isMe: boolean
  className: string
  height: string
  isFirst?: boolean
}) {
  if (!row) {
    return <div className={`${height} rounded-2xl border border-dashed border-border bg-secondary/30`} />
  }

  const rankIcon = rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉"
  const borderColor = rank === 1 ? "border-gold/40" : rank === 2 ? "border-slate-300/40" : "border-amber-600/40"
  const bgColor = rank === 1
    ? "bg-gold/10"
    : rank === 2
      ? "bg-slate-100 dark:bg-slate-800/40"
      : "bg-amber-50 dark:bg-amber-950/30"

  const ringStyle = isFirst
    ? "ring-2 ring-gold/40"
    : isMe
      ? "ring-1 ring-gold/30"
      : ""

  return (
    <div
      className={`${height} flex flex-col justify-end rounded-2xl border ${borderColor} ${bgColor} p-3 sm:p-4 ${ringStyle} ${className}`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-2xl sm:text-3xl">{rankIcon}</span>
        <Avatar
          name={row.displayName}
          image={row.image}
          avatarColor={row.avatarColor}
          size={rank === 1 ? "lg" : "md"}
        />
        <div className="min-w-0">
          <p className={`font-medium truncate max-w-[100px] ${isFirst ? "text-base" : "text-sm"} text-card-foreground`}>
            {row.displayName}
            {isMe && <span className="ml-1 text-[9px] text-gold">(toi)</span>}
          </p>
        </div>
        <p className={`font-heading tabular ${isFirst ? "text-lg" : "text-sm"} text-gold`}>
          {formatMoney(row.balance)}
        </p>
        <div className="flex items-center gap-2 text-xs tabular">
          <span className="text-primary">+{row.won}</span>
          <span className="text-destructive">-{row.lost}</span>
        </div>
        {row.streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-0.5 text-xs font-medium text-orange-400">
            🔥 {row.streak}
          </span>
        )}
      </div>
    </div>
  )
}
