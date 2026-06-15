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
        const s = 200
        canvas.width = s; canvas.height = s
        const ctx = canvas.getContext("2d")!
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, s, s)
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
          <Camera className="h-3 w-3 text-white" />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  )
}
