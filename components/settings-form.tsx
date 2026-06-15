"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar } from "@/components/avatar"
import { updateProfileImage, updateDisplayName } from "@/app/actions/profile"
import { User, Camera, Save } from "lucide-react"

export function SettingsForm({ currentName, currentImage }: { currentName: string; currentImage: string | null }) {
  const router = useRouter()
  const [name, setName] = useState(currentName)
  const [imageUrl, setImageUrl] = useState(currentImage ?? "")
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)

  async function handleSaveName() {
    setSavingName(true)
    const res = await updateDisplayName(name)
    if (res.ok) toast.success("Pseudo mis à jour !")
    else toast.error(res.error)
    setSavingName(false)
  }

  async function handleSaveImage() {
    setSavingImage(true)
    const res = await updateProfileImage(imageUrl)
    if (res.ok) {
      toast.success(imageUrl ? "Photo de profil mise à jour !" : "Photo supprimée.")
      router.refresh()
    } else {
      toast.error(res.error)
    }
    setSavingImage(false)
  }

  return (
    <div className="space-y-6">
      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-4">
        <Avatar name={name} image={imageUrl || undefined} size="xl" />
        <p className="text-sm text-muted-foreground text-center">
          Colle l&apos;URL d&apos;une image (Imgur, GitHub, etc.)
        </p>
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label htmlFor="image">URL de la photo</Label>
        <div className="flex gap-2">
          <Input
            id="image"
            placeholder="https://i.imgur.com/abc123.png"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <Button onClick={handleSaveImage} disabled={savingImage} variant="outline" className="shrink-0">
            <Camera className="h-4 w-4 mr-1" />
            {savingImage ? "..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-2">
        <Label htmlFor="name">Pseudo</Label>
        <div className="flex gap-2">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={30}
          />
          <Button onClick={handleSaveName} disabled={savingName || name === currentName} variant="outline" className="shrink-0">
            <Save className="h-4 w-4 mr-1" />
            {savingName ? "..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  )
}
