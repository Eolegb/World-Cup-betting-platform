"use client"

import { useState, useEffect, useRef } from "react"
import { sendChatMessage, getChatMessages, type ChatMessageRow } from "@/app/actions/social"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

function relativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 10) return "à l'instant"
  if (diffSecs < 60) return `il y a ${diffSecs}s`
  if (diffMins < 60) return `il y a ${diffMins} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays < 7) return `il y a ${diffDays}j`
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
}

export function MatchChat({ matchId }: { matchId: number }) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  useEffect(() => {
    getChatMessages(matchId).then((msgs) => {
      setMessages(msgs)
      prevLengthRef.current = msgs.length
    })

    const interval = setInterval(() => {
      getChatMessages(matchId).then((msgs) => {
        setMessages((prev) => {
          if (msgs.length !== prev.length) return msgs
          return prev
        })
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [matchId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom || messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    prevLengthRef.current = messages.length
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    setSending(true)
    setError(null)

    const result = await sendChatMessage(matchId, input.trim())

    if (result.ok) {
      setInput("")
      const msgs = await getChatMessages(matchId)
      setMessages(msgs)
    } else {
      setError(result.error)
    }

    setSending(false)
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      <div className="px-4 pt-4">
        <span className="text-sm font-medium">Chat du match</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[360px]"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun message. Soyez le premier à écrire !
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <Avatar size="sm" className="shrink-0">
              <AvatarFallback style={{ backgroundColor: msg.avatarColor }}>
                {msg.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-card-foreground">
                  {msg.displayName}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {relativeTime(new Date(msg.createdAt))}
                </span>
              </div>
              <p className="text-sm text-card-foreground break-words">
                {msg.message}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez un message..."
          maxLength={500}
          className="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || sending}
          aria-label="Envoyer"
        >
          <Send className="size-3.5" />
        </Button>
      </form>
      {error && (
        <p className="px-4 pb-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
