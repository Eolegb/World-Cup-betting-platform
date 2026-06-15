"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function ResetBalancesButton() {
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    if (!confirm("Restaurer toutes les cagnottes à leur dernière valeur sauvegardée ?")) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/reset-balances")
      const data = await res.json()
      if (data.ok) {
        alert(`${data.restored} cagnottes restaurées.`)
        window.location.reload()
      } else {
        alert("Erreur lors de la restauration.")
      }
    } catch {
      alert("Erreur réseau.")
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleReset} disabled={loading} variant="outline" className="font-medium">
      {loading ? "Restauration..." : "🔄 Restaurer les cagnottes"}
    </Button>
  )
}
