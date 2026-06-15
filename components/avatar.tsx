import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/team-colors"

const AVATAR_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#34495e",
]

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

type AvatarSize = "sm" | "md" | "lg"

const SIZE_MAP: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: "size-8", text: "text-xs" },
  md: { container: "size-10", text: "text-sm" },
  lg: { container: "size-12", text: "text-base" },
}

export function Avatar({
  name,
  image,
  avatarColor,
  size = "md",
  className,
}: {
  name: string
  image?: string | null
  avatarColor?: string | null
  size?: AvatarSize
  className?: string
}) {
  const bg = avatarColor || hashColor(name)
  const sizes = SIZE_MAP[size]
  const initials = getInitials(name)

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", sizes.container, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        sizes.container,
        sizes.text,
        className,
      )}
      style={{ backgroundColor: bg }}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
