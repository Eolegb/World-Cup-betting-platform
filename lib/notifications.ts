// Smart notification templates — 12 fun, engaging push messages.
// Each template uses {user} for the user's name and match data placeholders.

type Template = {
  title: string
  body: string
  vibe: string // 🇫🇷 hype | 🔥 rivalry | ⚽ scorer | 🤯 surprise | 🎯 stats
}

const TEMPLATES: Template[] = [
  {
    title: "🇫🇷 Les Bleus entrent en lice !",
    body: "La France joue aujourd'hui. Tu crois vraiment que tu vas rater ça {user} ?",
    vibe: "hype",
  },
  {
    title: "🔥 Le Classique",
    body: "Quand {home} affronte {away}, y'a pas de match amical. Choisis ton camp avant qu'il soit trop tard.",
    vibe: "rivalry",
  },
  {
    title: "⚽ Qui va faire trembler les filets ?",
    body: "Kane ? Mbappé ? Messi ? Pose ton prono buteur sur {home} vs {away}. La gloire t'attend.",
    vibe: "scorer",
  },
  {
    title: "🤯 Un score que personne n'a vu venir",
    body: "{home} vs {away} pourrait bien être LE match surprise de la journée. Et si tu lisais l'avenir ?",
    vibe: "surprise",
  },
  {
    title: "📊 Les chiffres parlent",
    body: "76% des parieurs misent sur {home}. Et si tu faisais mieux que la foule {user} ?",
    vibe: "stats",
  },
  {
    title: "👑 Ton classement t'attend",
    body: "Y'a du mouvement dans le top 3. Va vérifier si t'es toujours sur le podium {user}.",
    vibe: "stats",
  },
  {
    title: "⏰ Dernier appel",
    body: "{user}, {home} vs {away} c'est bientôt. Dans 30 minutes, il sera trop tard pour parier.",
    vibe: "hype",
  },
  {
    title: "🌍 Mondial oblige",
    body: "La Coupe du Monde, ça se vit à fond. {home} vs {away} arrive. Pose ton prono ou vis avec des regrets.",
    vibe: "hype",
  },
  {
    title: "🎯 Il l'a fait. Et toi ?",
    body: "Un joueur a marqué un doublé hier. Aujourd'hui {home} vs {away}, qui sera le héros ?",
    vibe: "scorer",
  },
  {
    title: "🧠 Stratège",
    body: "Le score exact paie plus. {home} vs {away} : tente un 2-1, un 3-0, qui sait ? C'est ça la beauté du foot.",
    vibe: "surprise",
  },
  {
    title: "🏆 J-1 avant un choc",
    body: "Demain, {home} affronte {away}. Les vrais stratèges parient en avance. Tu en es {user} ?",
    vibe: "rivalry",
  },
  {
    title: "🎉 Ambiance Coupe du Monde",
    body: "Des buts, des cris, des paris qui passent ou qui cassent. Ouvre BetRod et fais ton choix sur {home} vs {away}.",
    vibe: "hype",
  },
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function hourOfDay(): number {
  return new Date().getHours()
}

/**
 * Select a template based on time of day + match context.
 * - Morning (6-12): strategic/anticipation vibes
 * - Afternoon (12-18): hype/rivalry vibes
 * - Evening (18-24): last call/scorer vibes
 * - Night (0-6): no notifications
 */
export function pickNotification(userName: string, homeTeam: string, awayTeam: string, matchUrl: string): { title: string; body: string; url: string; tag: string } | null {
  const h = hourOfDay()
  if (h >= 0 && h < 6) return null // No notifications at night

  let pool = TEMPLATES
  if (h >= 6 && h < 12) pool = TEMPLATES.filter(t => t.vibe === "stats" || t.vibe === "surprise")
  else if (h >= 18) pool = TEMPLATES.filter(t => t.vibe === "hype" || t.vibe === "scorer")

  const template = pick(pool.length > 0 ? pool : TEMPLATES)
  const body = template.body
    .replace(/\{user\}/g, userName)
    .replace(/\{home\}/g, homeTeam)
    .replace(/\{away\}/g, awayTeam)

  return {
    title: template.title,
    body,
    url: matchUrl,
    tag: `smart-${Date.now() % 1000}`,
  }
}
