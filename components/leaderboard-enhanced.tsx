"use client"

import { formatMoney } from "@/lib/format"
import { getBadgeEmoji } from "@/lib/gamification"
import type { LeaderRow } from "@/lib/queries"

const AVATAR_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12",
  "#9b59b6", "#1abc9c", "#e67e22", "#34495e",
]
function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

export function LeaderboardEnhanced({ rows, myUserId }: { rows: LeaderRow[]; myUserId: string }) {
  if (!rows.length) return null

  const top3 = rows.slice(0, 3)
  // Ordre podium : 2e, 1er, 3e
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderRow[]
  const podiumRanks = top3[1] ? [2, 1, 3] : top3[0] ? [1] : []

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* Podium                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
        {podiumOrder.map((row, i) => {
          const rank = podiumRanks[i]
          return (
            <PodiumCard
              key={row.userId}
              rank={rank}
              row={row}
              isMe={row.userId === myUserId}
            />
          )
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Full leaderboard list                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/60 backdrop-blur-sm">
        <div className="divide-y divide-border/30">
          {rows.slice(top3.length).map((r, i) => {
            const rank = top3.length + i + 1
            const isMe = r.userId === myUserId
            const color = r.avatarColor || hashColor(r.displayName)
            return (
              <div
                key={r.userId}
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${isMe ? "bg-gold/5" : ""}`}
              >
                {/* Rank */}
                <div className="w-7 text-center shrink-0">
                  {rank === 1 ? (
                    <span className="text-base">🥇</span>
                  ) : rank === 2 ? (
                    <span className="text-base">🥈</span>
                  ) : rank === 3 ? (
                    <span className="text-base">🥉</span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="shrink-0">
                  {r.image ? (
                    <img src={r.image} alt={r.displayName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {getInitials(r.displayName)}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium truncate block ${isMe ? "text-gold" : "text-foreground"}`}>
                    {r.displayName}
                    {isMe && <span className="ml-1 text-[9px] text-gold/70">(toi)</span>}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-primary">{r.won}G</span>
                    <span className="text-[10px] text-muted-foreground">/</span>
                    <span className="text-[10px] text-destructive">{r.lost}P</span>
                    {r.streak > 0 && <span className="text-[10px] text-orange-400">🔥{r.streak}</span>}
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right shrink-0">
                  <span className={`font-heading tabular text-sm ${isMe ? "text-gold" : "text-foreground"}`}>
                    {formatMoney(r.balance)}
                  </span>
                  {r.badges.length > 0 && (
                    <div className="flex justify-end gap-0.5 mt-0.5">
                      {r.badges.slice(0, 3).map(b => (
                        <span key={b} title={b} className="text-[11px]">{getBadgeEmoji(b)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PodiumCard — avatar plein cadre, texte dans overlay bas
// ---------------------------------------------------------------------------

const HEIGHTS: Record<1 | 2 | 3, string> = {
  1: "h-56 sm:h-64",
  2: "h-48 sm:h-56",
  3: "h-40 sm:h-48",
}

const RANK_LABEL: Record<1 | 2 | 3, string> = {
  1: "👑",
  2: "🥈",
  3: "🥉",
}

function PodiumCard({ rank, row, isMe }: { rank: number; row: LeaderRow; isMe: boolean }) {
  const r = rank as 1 | 2 | 3
  const height = HEIGHTS[r]
  const rankLabel = RANK_LABEL[r]
  const color = row.avatarColor || hashColor(row.displayName)
  const isFirst = rank === 1

  return (
    <div
      className={`
        relative ${height} rounded-2xl overflow-hidden
        ${isFirst
          ? "ring-2 ring-gold/50 shadow-lg shadow-gold/20"
          : "ring-1 ring-border/40"}
        ${isMe ? "ring-2 ring-gold/60" : ""}
      `}
    >
      {/* Background : image ou initiales */}
      {row.image ? (
        <img
          src={row.image}
          alt={row.displayName}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <span
            className="font-heading font-bold text-white/20 select-none"
            style={{ fontSize: "clamp(3rem, 8vw, 5rem)" }}
          >
            {getInitials(row.displayName)}
          </span>
        </div>
      )}

      {/* Gradient overlay — du bas vers le milieu */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* Rank badge — en haut à gauche */}
      <div className="absolute top-2.5 left-2.5">
        <span className={`text-xl ${isFirst ? "drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" : ""}`}>
          {rankLabel}
        </span>
      </div>

      {/* Contenu bas — dans le gradient */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
        <p className="font-medium text-xs sm:text-sm text-white truncate leading-tight">
          {row.displayName}
          {isMe && <span className="ml-1 text-[9px] text-gold">(toi)</span>}
        </p>
        <p className={`font-heading tabular text-sm sm:text-base mt-0.5 ${isFirst ? "text-gold" : "text-white/90"}`}>
          {formatMoney(row.balance)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-primary font-medium">{row.won}G</span>
          <span className="text-[10px] text-white/40">/</span>
          <span className="text-[10px] text-destructive">{row.lost}P</span>
          {row.streak > 0 && (
            <span className="text-[10px] text-orange-400 ml-auto">🔥{row.streak}</span>
          )}
        </div>
      </div>
    </div>
  )
}
