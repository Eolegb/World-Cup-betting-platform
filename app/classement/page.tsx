import { requireUser, AppShell } from "@/components/app-shell"
import { getLeaderboard, type LeaderRow } from "@/lib/queries"
import { formatMoney } from "@/lib/format"
import { Crown, Medal, TrendingUp, TrendingDown, User } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  const { user, profile: me } = await requireUser()
  const rows = await getLeaderboard()

  const myIndex = rows.findIndex((r) => r.userId === user.id)
  const myRow = myIndex !== -1 ? rows[myIndex] : null

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

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
        <>
          {/* My rank card */}
          {myRow && (
            <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/30 font-heading text-sm text-gold">
                    #{myIndex + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{myRow.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {myRow.won} gagnés · {myRow.lost} perdus · {myRow.pending} en cours
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-heading text-xl tabular text-gold">{formatMoney(myRow.balance)}</p>
                  <p className={`text-xs tabular ${myRow.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {myRow.netProfit >= 0 ? "+" : ""}{formatMoney(myRow.netProfit)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {top3.map((r, i) => {
                const isMe = r.userId === user.id
                const medals = [
                  { icon: <Crown className="h-5 w-5 text-gold" />, bg: "bg-gold/20", border: "border-gold/40" },
                  { icon: <Medal className="h-5 w-5 text-muted-foreground" />, bg: "bg-secondary", border: "border-border" },
                  { icon: <Medal className="h-5 w-5 text-amber-600" />, bg: "bg-secondary", border: "border-border" },
                ]
                const style = medals[i]

                return (
                  <div
                    key={r.userId}
                    className={`rounded-2xl border ${style.border} ${style.bg} p-4 ${isMe ? "ring-1 ring-gold/50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background font-heading text-sm text-foreground">
                        #{i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium text-foreground truncate">
                          {r.displayName}
                          {isMe && <span className="text-[10px] text-gold">(toi)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.won}G · {r.lost}P · {r.pending}C
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-base tabular text-foreground">{formatMoney(r.balance)}</p>
                        <p className={`text-xs tabular ${r.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                          {r.netProfit >= 0 ? "+" : ""}{formatMoney(r.netProfit)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full table */}
          {rest.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">#</th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">Joueur</th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">Gagnés</th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">Perdus</th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">Solde</th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((r, i) => {
                      const isMe = r.userId === user.id
                      const rank = i + 4
                      return (
                        <tr
                          key={r.userId}
                          className={`border-b border-border transition-colors hover:bg-muted/50 ${
                            isMe ? "bg-gold/5" : ""
                          }`}
                        >
                          <td className="p-4 font-heading tabular text-muted-foreground">#{rank}</td>
                          <td className="p-4">
                            <span className={`font-medium ${isMe ? "text-gold" : "text-card-foreground"}`}>
                              {r.displayName}
                              {isMe && <span className="ml-1 text-[10px] text-gold">(toi)</span>}
                            </span>
                          </td>
                          <td className="p-4 text-right tabular text-primary">{r.won}</td>
                          <td className="p-4 text-right tabular text-destructive">{r.lost}</td>
                          <td className="p-4 text-right font-heading tabular text-card-foreground">{formatMoney(r.balance)}</td>
                          <td className={`p-4 text-right font-heading tabular ${r.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                            {r.netProfit >= 0 ? "+" : ""}{formatMoney(r.netProfit)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* If only top 3 or less, hide empty table */}
          {rows.length <= 3 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              {rows.length} joueur{rows.length > 1 ? "s" : ""} dans le classement.
            </p>
          )}
        </>
      )}
    </AppShell>
  )
}
