# 🔍 Audit complet — Application BetRod (World Cup 2026 Betting)

Tu es un expert Next.js/TypeScript/PostgreSQL. Voici l'intégralité du projet à auditer.

---

## 1. Contexte

**BetRod** est une app de paris entre amis pour la Coupe du Monde 2026, hébergée sur **Vercel (plan Hobby)** avec une base **PostgreSQL Neon**. Stack : Next.js 16 App Router, Drizzle ORM, Better Auth, Tailwind CSS, shadcn/ui.

L'appli a 8 utilisateurs, 104 matchs (importés via football-data.org), et une trentaine de paris placés. Le problème : rien ne se met à jour automatiquement, les boutons donnent des erreurs.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│  Vercel (Hobby — 10s timeout fonctions serveur) │
│  next.config: ignoreBuildErrors: true            │
└─────────────────────────────────────────────────┘
         │
    ┌────▼────────┐  ┌──────────┐  ┌──────────────┐
    │ Next.js 16   │  │ Neon PG  │  │ APIs externes │
    │ App Router   │  │ (DB)     │  │               │
    └─────────────┘  └──────────┘  └──────────────┘
```

### Tables principales (Drizzle schema)

```ts
// lib/db/schema.ts
match: id, externalId (bigint), homeTeam, awayTeam, homeTeamCode, awayTeamCode, kickoff (timestamp), status ("scheduled"|"finished"), homeScore, awayScore, oddsJson (jsonb), lastSyncedAt
bet: id, userId, matchId, marketType, label, selection (jsonb), stake, odds, potentialPayout, status ("pending"|"won"|"lost"), payout, isJoker, settledAt
matchEvent: id, matchId, type ("goal"), player, team, minute
profile: userId, displayName, balance, balanceBackup, isAdmin, streak, avatarColor, jokerUsedAt
```

---

## 3. APIs utilisées pour les données

### Source 1 : football-data.org (plan gratuit, 10 req/min)
- Clé : `42ce3f42f729447884fa54aa9735b19d`
- Endpoint fixtures : `GET /v4/competitions/WC/matches?season=2026&limit=200`
- Endpoint match detail : `GET /v4/matches/{id}`
- **Problème** : Pas de buteurs détaillés sur le plan gratuit, seulement les scores

### Source 2 : worldcup26.ir (gratuit, pas de clé)
- Endpoint : `GET https://worldcup26.ir/get/games`
- Retourne TOUS les matchs avec scores, buteurs (noms + minutes), statut
- Format buteurs : `{"J. Quiñones 9'", "R. Jiménez 67'"}`
- **Avantage** : Gratuit, pas de rate limit, buteurs inclus

### Source 3 : the-odds-api.com (gratuit, 500 req/mois)
- Utilisée pour les cotes 1X2 et totals, stockées dans `match.oddsJson`

---

## 4. Flux de synchronisation (théorique)

### Flux A — Polling automatique (côté client)
```
Dashboard ouvert → composant <LiveScorePoller> → useEffect → setInterval(45s)
  → navigateur appelle https://worldcup26.ir/get/games (pas Vercel)
  → parse les matchs FINISHED avec scores
  → appelle saveBatchResults() (server action) → update DB + settle bets
  → router.refresh()
```
**Fichiers** : `components/use-live-scores.ts`, `components/live-score-poller.tsx`, `app/actions/save-batch-results.ts`

### Flux B — Bouton API manuel (admin, par match)
```
Admin → clic bouton "API" sur un match
  → navigateur appelle https://api.football-data.org/v4/matches/{extId}
  → parse le score
  → appelle saveMatchResult() (server action) → update DB
```
**Fichiers** : `components/fetch-score-button.tsx`, `app/actions/save-match-result.ts`

### Flux C — Bouton Score manuel (admin)
```
Admin → clic "Score" → formulaire → entre score + buteurs manuellement
  → setMatchResult() → update match + goals + settle bets
```
**Fichiers** : `app/actions/set-match-result.ts`, `components/manual-score-form.tsx`

### Flux D — Synchro complète (admin)
```
Admin → clic "Lancer la synchronisation" → POST /api/sync
  → runSync() dans lib/sync.ts
  → fetchFixtures(true) → upsert matchs
  → fetchLiveFixtures() → update scores
  → détection matchs finis (kickoff + 95 min)
  → settleMatch() pour chaque match fini
  → updateAllOdds()
```
**Fichiers** : `lib/sync.ts`, `lib/providers.ts`, `app/api/sync/route.ts`

---

## 5. Tous les problèmes rencontrés

### 🔴 Problème 1 : Les boutons "Clôturer" / "API" donnent "API indisponible"
- **Cause** : Les server actions appellent l'API football-data.org depuis le serveur Vercel
- **Vercel Hobby kill les fonctions après 10 secondes**
- football-data.org met parfois 5-8s à répondre depuis les serveurs US de Vercel
- Si le fetch dépasse 10s → Vercel kill → `null` → "API indisponible"
- **Fix appliqué** : Le bouton "API" fetch maintenant depuis le navigateur (pas de timeout)
- **Fix appliqué** : Ajout d'un AbortController avec timeout 9s dans `fetchMatchDetail()`

### 🔴 Problème 2 : Les scores ne s'actualisent pas automatiquement
- **Cause historique** : Le background sync (app-shell.tsx) appelait runSync() côté serveur
- runSync() appelait fetchFixtures() et fetchMatchDetail() → timeout Vercel
- La synchro échouait silencieusement (catch vide)
- **Fix appliqué** : Background sync supprimé, remplacé par polling côté client (useLiveScores)
- **Fix appliqué** : Le composant LiveScorePoller tourne sur le dashboard (toutes les 45s)

### 🔴 Problème 3 : externalId stocké en string, comparé à des numbers
- PostgreSQL bigint → node-postgres → string ("537335")
- API football-data.org → number (537335)
- `fixtures.find(f => f.id === "537335")` → false car `"537335" !== 537335`
- **Fix appliqué** : Conversion avec `Number()` ou `String()` selon le contexte

### 🔴 Problème 4 : Les matchs restent "scheduled" alors qu'ils sont finis
- `mapStatus()` mappe IN_PLAY/LIVE → "scheduled" (on a supprimé le statut "live")
- La détection de fin ne fonctionnait que dans le live sync (pas dans le full sync)
- Le full sync (`runSync`) ne vérifiait pas les matchs finis pendant longtemps
- **Fix appliqué** : Ajout de la détection dans runSync() + dans le polling client

### 🔴 Problème 5 : Les paris ne sont pas résolus même après màj du score
- `settleMatch()` n'était appelé que pour les matchs VIENT d'être marqués finished
- Les matchs déjà "finished" avec paris "pending" étaient ignorés
- **Fix appliqué** : Boucle de rattrapage sur TOUS les matchs "finished"

### 🟡 Problème 6 : Rate limit football-data.org (10 req/min)
- La synchro complète fait plusieurs appels API
- Si plusieurs utilisateurs cliquent en même temps → limite atteinte
- **Fix partiel** : Polling utilise worldcup26.ir (pas de limite)
- **Fix partiel** : Boutons admin utilisent fetchFixtures (1 appel pour 104 matchs)

### 🟡 Problème 7 : Vercel Cron Hobby limité à 1/jour
- Impossible d'avoir des crons toutes les heures ou toutes les 30 minutes
- **Contournement** : Polling côté client (navigateur → API directe)

---

## 6. État actuel du code (fichiers clés)

### `components/use-live-scores.ts` — Polling automatique
```ts
// Appelle worldcup26.ir/get/games depuis le navigateur
// Parse les scores + buteurs (format: "J. Quiñones 9'")
// Envoie à saveBatchResults() pour sauver en DB
// Tourne toutes les 45 secondes
```

### `app/actions/save-batch-results.ts` — Sauvegarde des résultats
```ts
// Reçoit [{ homeTeam, awayTeam, homeScore, awayScore, goals }]
// Match les équipes par nom dans la DB (eq(homeTeam), eq(awayTeam))
// Update status="finished", stocke les buts, settle les paris
```

### `components/fetch-score-button.tsx` — Bouton API par match
```ts
// Fetch football-data.org DIRECTEMENT depuis le navigateur
// Puis appelle saveMatchResult() server action
```

### `lib/sync.ts` — Synchro complète (admin)
```ts
// mapStatus: FINISHED → "finished", tout le reste → "scheduled"
// syncFixtures: upsert les 104 matchs
// Détection finis: matchs "scheduled" avec kickoff + 95 min
// Appelle fetchMatchDetail() pour chaque → update + settle
```

### `app/admin/page.tsx` — Interface admin
```ts
// Tableau des matchs avec boutons: API | Score
// Tableau des paris avec boutons: Clôturer | Modifier
// Stats: total matchs, paris, gagnés/perdus/en cours
```

---

## 7. Ce qu'il faut vérifier pour trouver la faille restante

1. **Vérifier que `<LiveScorePoller />` est bien rendu** dans `app/page.tsx` (dashboard)
2. **Vérifier que worldcup26.ir répond** : `curl https://worldcup26.ir/get/games`
3. **Vérifier les logs console** du navigateur (F12) pour voir si le polling tourne
4. **Vérifier que `saveBatchResults` matche bien les noms d'équipes** entre l'API et la DB. Exemple : API dit "Switzerland", DB dit "Switzerland" → OK. Mais si API dit "Bosnia and Herzegovina" et DB dit "Bosnia-Herzegovina" → mismatch !
5. **Vérifier les timeouts Vercel** : les logs Vercel montrent-ils des `FUNCTION_INVOCATION_TIMEOUT` ?
6. **Vérifier que les variables d'env sont bien sur Vercel** : `FOOTBALL_DATA_KEY`, `ODDS_API_KEY`
7. **Vérifier le build** : `pnpm build` passe-t-il sans erreur ?
8. **Vérifier la page Admin** : les boutons API/Score/Clôturer/Modifier fonctionnent-ils ?

---

## 8. Comment tester l'application

```bash
# Cloner le repo
git clone https://github.com/Eolegb/World-Cup-betting-platform.git
cd World-Cup-betting-platform

# Installer
pnpm install

# Configurer .env.local (demander les valeurs à l'admin)
# DATABASE_URL=postgresql://...
# BETTER_AUTH_URL=http://localhost:3000
# BETTER_AUTH_SECRET=...
# FOOTBALL_DATA_KEY=42ce3f42f729447884fa54aa9735b19d
# ODDS_API_KEY=26e85491845a543ee3d0d2c954634ceb
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...

# Lancer
pnpm dev

# Tester le polling
curl https://worldcup26.ir/get/games

# Tester la synchro complète
curl -X POST http://localhost:3000/api/sync -H "Authorization: Bearer sync-secret-change-me"

# Tester la détection de matchs finis
curl http://localhost:3000/api/sync/live
```

---

## 9. Le vrai problème probable

D'après mon analyse, le problème LE PLUS probable est le **mismatch des noms d'équipes** entre worldcup26.ir et la DB :

| worldcup26.ir | Notre DB |
|---|---|
| "Switzerland" | "Switzerland" ✅ |
| "Bosnia and Herzegovina" | "Bosnia-Herzegovina" ❌ |
| "United States" | "United States" ✅ |
| "Czech Republic" | "Czechia" ❌ |
| "Cape Verde" | "Cape Verde Islands" ❌ |
| "CD Congo DR" | ? ❌ |

Si les noms ne matchent pas exactement, `saveBatchResults` ne trouve pas le match → ne met jamais à jour → les paris restent "pending".

**Vérifie ça en priorité.**
