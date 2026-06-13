"use client"

import { useState } from "react"
import { cancelBet } from "@/app/actions/bets"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function CancelBetButton({ betId }: { betId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleCancel() {
    if (!confirm("Annuler ce pari ? Ta mise sera remboursée.")) return
    setPending(true)
    try {
      const res = await cancelBet(betId)
      if (res.ok) {
        toast.success("Pari annulé et mise remboursée.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error("Erreur lors de l'annulation.")
    }
    setPending(false)
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleCancel} disabled={pending} className="h-8 w-8 text-muted-foreground hover:text-destructive">
      <X className="h-4 w-4" />
    </Button>
  )
}
