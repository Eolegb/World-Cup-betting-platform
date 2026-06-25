"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function BracketAdminBar({ published }: { published: boolean }) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)

  async function handleSyncBracket() {
    setSyncing(true)
    try {
      const res = await fetch("/api/sync-wc26")
      const data = await res.json()

      if (data.ok) {
        const msg = [
          `${data.inserted} nouveaux matchs`,
          data.inserted_ids?.length > 0
            ? `→ ${data.inserted_ids.slice(0, 5).join(", ")}${data.inserted_ids.length > 5 ? ` +${data.inserted_ids.length - 5} autres` : ""}`
            : "",
        ].filter(Boolean).join("\n")

        toast.success(data.inserted > 0 ? msg : "Aucun nouveau match — le bracket est à jour", {
          duration: 6000,
        })
      } else {
        toast.error(data.errors?.[0] ?? "Erreur de synchro")
      }
    } catch {
      toast.error("Erreur réseau")
    }
    setSyncing(false)
    router.refresh()
  }

  return (
    <Button
      onClick={handleSyncBracket}
      disabled={syncing}
      variant="secondary"
      size="sm"
      className="font-medium"
    >
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Synchro..." : "Mettre à jour le bracket"}
    </Button>
  )
}
