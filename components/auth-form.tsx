"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? "Une erreur est survenue")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src="/logo.png" alt="BetRod" className="h-12 w-12 rounded-2xl object-contain" />
          <div className="leading-tight">
            <p className="font-heading text-xl text-foreground">BetRod</p>
            <p className="text-xs text-muted-foreground">Coupe du Monde 2026</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-6">
            <h1 className="font-heading text-2xl text-card-foreground text-balance">
              {isSignUp ? "Rejoindre la ligue" : "Bon retour"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp
                ? "Crée ton compte pour commencer à parier."
                : "Connecte-toi pour suivre tes paris et le classement."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Pseudo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Ex: Le Boss des pronos"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full font-medium">
              {loading ? "Patiente..." : isSignUp ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {isSignUp ? "Déjà un compte ? " : "Pas encore de compte ? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? "Se connecter" : "S'inscrire"}
            </Link>
          </p>
        </div>

        {isSignUp && (
          <p className="text-xs text-muted-foreground text-center mt-4 text-balance">
            Chaque joueur démarre avec 1000 € de jetons. À toi de faire fructifier ta cagnotte !
          </p>
        )}
      </div>
    </main>
  )
}
