# Plan d'exécution — Final fixes

## 1. Réparer la fin des matchs
**Fichier : `app/api/sync/live/route.ts`** — Remplacer entièrement

Le nouveau code fait :
- Étape 1 : traite les matchs live renvoyés par l'API (comme avant)
- Étape 2 (NOUVEAU) : requête SQL pour trouver les matchs en base avec `status = 'live'` ET `kickoff > 2h` 
- Pour chaque match live en base qui n'est PLUS dans la liste API → appel `fetchMatchDetail(id)` → si `FINISHED` → met à jour statut, score, buts → résout les paris

Code complet dans le plan détaillé ci-dessous.

---

## 2. Backup des cagnottes
**Fichier : `lib/db/schema.ts`**
- Ajouter à la table `profile` : `balanceBackup: integer("balanceBackup").notNull().default(1000)`

**Fichier : `lib/sync.ts`**  
- Dans `settleMatch()`, avant de créditer les gagnants : copier `balance → balanceBackup`
```ts
await tx.update(profile).set({ balanceBackup: sql`${profile.balance}` }).where(eq(profile.userId, b.userId))
```

**Fichier : `app/api/admin/reset-balances/route.ts`** — NOUVEAU
```ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await db.select({ userId: profile.userId, balanceBackup: profile.balanceBackup }).from(profile)
  for (const r of rows) {
    await db.update(profile).set({ balance: r.balanceBackup }).where(eq(profile.userId, r.userId))
  }
  return NextResponse.json({ ok: true, restored: rows.length })
}
```

**Fichier : `app/admin/page.tsx`**  
- Ajouter un bouton "🔄 Restaurer cagnottes" qui appelle `/api/admin/reset-balances`

---

## 3. Avatar cliquable

**Fichier : `components/avatar-upload.tsx`** — NOUVEAU
```tsx
"use client"
import { useRef, useState } from "react"
import { Avatar } from "@/components/avatar"
import { updateAvatar } from "@/app/actions/profile"
import { toast } from "sonner"
import { Camera } from "lucide-react"

export function AvatarUpload({ name, currentImage, size = "md" }: { name: string; currentImage: string | null; size?: "sm" | "md" }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState(currentImage)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement("canvas")
        const size = 200
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")!
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        const base64 = canvas.toDataURL("image/jpeg", 0.8)
        setImage(base64)
        const res = await updateAvatar(base64)
        if (res.ok) toast.success("Photo mise à jour !")
        else toast.error(res.error)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <button onClick={() => inputRef.current?.click()} className="relative group shrink-0" title="Changer la photo">
        <Avatar name={name} image={image} size={size} className="cursor-pointer" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-4 w-4 text-white" />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  )
}
```

**Fichier : `app/actions/profile.ts`** — Réécrire
```ts
"use server"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateAvatar(base64: string) {
  const userId = await getUserId()
  if (!base64.startsWith("data:image/")) return { ok: false as const, error: "Format invalide" }
  await db.update(user).set({ image: base64 }).where(eq(user.id, userId))
  revalidatePath("/")
  return { ok: true as const }
}
```

**Fichier : `components/app-nav.tsx`**
- Importer AvatarUpload
- Retirer `{ href: "/settings", label: "Profil", icon: Settings }` des LINKS
- Retirer l'import Settings
- Remplacer le `<span>displayName</span>` par `<AvatarUpload name={displayName} currentImage={image} size="sm" />` + `<span>displayName</span>`
- Ajouter `image?: string | null` aux NavProps

**Fichier : `app/page.tsx`**
- Passer `user.image` au AppShell

**Fichier : `components/app-shell.tsx`**
- Ajouter `image?: string | null` au type profile
- Passer `image` au AppNav

---

## 4. Nettoyage
- Supprimer `app/settings/page.tsx`
- Supprimer `components/settings-form.tsx`
- Push schema : `pnpm drizzle-kit push`

---

## 5. Ordre d'exécution
1. Schema (balanceBackup)
2. Live sync route
3. lib/sync.ts (backup)
4. Admin restore endpoint + bouton
5. Avatar upload component
6. App-nav (avatar cliquable)
7. App-shell + page.tsx (pass image)
8. Supprimer settings files
9. Build → commit → push
