import { requireUser, AppShell } from "@/components/app-shell"
import { SettingsForm } from "@/components/settings-form"
import { Settings } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const { user, profile: p } = await requireUser()

  return (
    <AppShell profile={p}>
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-heading text-2xl text-foreground">
            <Settings className="h-5 w-5 text-primary" />
            Réglages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personnalise ton profil et ta photo.
          </p>
        </div>

        <div className="rounded-3xl border border-border/40 glass-strong p-4 sm:p-6">
          <SettingsForm currentName={user.name ?? p.displayName} currentImage={user.image} />
        </div>
      </div>
    </AppShell>
  )
}
