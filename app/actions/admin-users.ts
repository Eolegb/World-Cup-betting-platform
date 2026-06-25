"use server"

import { db } from "@/lib/db"
import { user, profile } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { requireAdmin } from "@/lib/session"
import { revalidatePath } from "next/cache"

export async function resetUserBalance(nameOrEmail: string) {
  await requireAdmin()

  const users = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(or(eq(user.name, nameOrEmail), eq(user.email, nameOrEmail)))
    .limit(1)

  if (users.length === 0) {
    return { ok: false as const, error: `Utilisateur "${nameOrEmail}" non trouvé` }
  }

  const u = users[0]

  await db
    .update(profile)
    .set({
      balance: 1000,
      balanceBackup: 1000,
      jokerUsedAt: null,
    })
    .where(eq(profile.userId, u.id))

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/classement")

  return {
    ok: true as const,
    message: `${u.name ?? u.email} : solde = 1 000 €, joker réinitialisé`,
  }
}
