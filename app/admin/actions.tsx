"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { RefreshCw, FlaskConical } from "lucide-react"
import { seedDemoData } from "@/app/actions/seed"

export function AdminActions() {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function triggerSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { authorization: `Bearer sync-secret-change-me` },
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`Sync terminée : ${data.results.join(" | ")}`)
      } else {
        toast.error(data.error ?? "Échec de la synchronisation")
      }
    } catch {
      toast.error("Erreur réseau lors de la synchro.")
    }
    setSyncing(false)
    router.refresh()
  }

  async function triggerSeed() {
    if (!confirm("Générer des données de démonstration ? (nécessite une base vide)")) return
    setSeeding(true)
    try {
      const res = await seedDemoData()
      if (res.ok) {
        toast.success(res.message)
      } else {
        toast.error(res.error)
      }
    } catch (e) {
      toast.error("Erreur lors de la génération.")
    }
    setSeeding(false)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={triggerSync} disabled={syncing} className="font-medium">
        <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Synchro en cours..." : "Lancer la synchronisation"}
      </Button>
      <Button onClick={triggerSeed} disabled={seeding} variant="outline" className="font-medium">
        <FlaskConical className="mr-1.5 h-4 w-4" />
        {seeding ? "Génération..." : "Générer données de démo"}
      </Button>
    </div>
  )
}
