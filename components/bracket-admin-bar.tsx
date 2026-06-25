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
        toast.success(
          data.inserted > 0
            ? `${data.inserted} nouvelles équipes dans le bracket — ${data.summary?.scheduled ?? 0} matchs à venir`
            : "Bracket et groupes à jour",
          { duration: 5000 }
        )
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
