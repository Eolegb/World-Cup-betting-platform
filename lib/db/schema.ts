import { pgTable, text, timestamp, boolean, serial, integer, bigint, jsonb, numeric, unique } from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables ------------------------------------------------------------

export const AVATAR_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"]

export const profile = pgTable("profile", {
  userId: text("userId").primaryKey(),
  displayName: text("displayName").notNull(),
  balance: integer("balance").notNull().default(1000),
  balanceBackup: integer("balanceBackup").notNull().default(1000),
  isAdmin: boolean("isAdmin").notNull().default(false),
  avatarColor: text("avatarColor").notNull().default("#3498db"),
  streak: integer("streak").notNull().default(0),
  bestStreak: integer("bestStreak").notNull().default(0),
  jokerUsedAt: timestamp("jokerUsedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const match = pgTable("match", {
  id: serial("id").primaryKey(),
  externalId: bigint("externalId", { mode: "number" }).unique(),
  homeTeam: text("homeTeam").notNull(),
  awayTeam: text("awayTeam").notNull(),
  homeTeamCode: text("homeTeamCode"),
  awayTeamCode: text("awayTeamCode"),
  kickoff: timestamp("kickoff").notNull(),
  stage: text("stage"),
  venue: text("venue"),
  status: text("status").notNull().default("scheduled"),
  elapsed: integer("elapsed"),
  homeScore: integer("homeScore").notNull().default(0),
  awayScore: integer("awayScore").notNull().default(0),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const matchEvent = pgTable(
  "match_event",
  {
    id: serial("id").primaryKey(),
    matchId: integer("matchId").notNull(),
    externalId: text("externalId"),
    type: text("type").notNull(),
    detail: text("detail"),
    player: text("player"),
    team: text("team"),
    minute: integer("minute"),
    extraMinute: integer("extraMinute"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    unique("match_event_unique").on(table.matchId, table.player, table.minute, table.type),
  ]
)

export const bet = pgTable("bet", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  matchId: integer("matchId").notNull(),
  marketType: text("marketType").notNull(),
  label: text("label").notNull(),
  selection: jsonb("selection").notNull(),
  minuteFrom: integer("minuteFrom"),
  minuteTo: integer("minuteTo"),
  stake: integer("stake").notNull(),
  odds: numeric("odds", { precision: 7, scale: 2 }).notNull(),
  potentialPayout: integer("potentialPayout").notNull(),
  status: text("status").notNull().default("pending"),
  payout: integer("payout").notNull().default(0),
  isJoker: boolean("isJoker").notNull().default(false),
  bonusPoints: integer("bonusPoints").notNull().default(0),
  settledAt: timestamp("settledAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const ledger = pgTable("ledger", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  betId: integer("betId"),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balanceAfter").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Social tables ---------------------------------------------------------

export const activityFeed = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(), // bet_placed, bet_won, bet_lost, goal_scored, badge_earned, streak
  message: text("message").notNull(),
  matchId: integer("matchId"),
  betId: integer("betId"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const betReaction = pgTable(
  "bet_reaction",
  {
    id: serial("id").primaryKey(),
    betId: integer("betId").notNull(),
    userId: text("userId").notNull(),
    emoji: text("emoji").notNull(), // 🔥, 😂, 💀, etc.
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    unique("bet_reaction_unique").on(table.betId, table.userId, table.emoji),
  ]
)

export const chatMessage = pgTable("chat_message", {
  id: serial("id").primaryKey(),
  matchId: integer("matchId").notNull(),
  userId: text("userId").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Gamification tables ---------------------------------------------------

export const badge = pgTable(
  "badge",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    badgeType: text("badgeType").notNull(), // prophet, flop, all_in, hot_streak, early_bird, group_master, perfect_score
    earnedAt: timestamp("earnedAt").notNull().defaultNow(),
  },
  (table) => [
    unique("badge_unique").on(table.userId, table.badgeType),
  ]
)

export const tournamentPrediction = pgTable("tournament_prediction", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  predictedTeam: text("predictedTeam").notNull(),
  isCorrect: boolean("isCorrect"),
  bonusAwarded: integer("bonusAwarded").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Push notifications ----------------------------------------------------

export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    unique("push_sub_unique").on(table.userId, table.endpoint),
  ]
)
