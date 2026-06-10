import { pgTable, text, timestamp, boolean, serial, integer, bigint, jsonb, numeric } from "drizzle-orm/pg-core"

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

// Per-user profile: balance (starts at 1000), display name, admin flag.
export const profile = pgTable("profile", {
  userId: text("userId").primaryKey(),
  displayName: text("displayName").notNull(),
  balance: integer("balance").notNull().default(1000),
  isAdmin: boolean("isAdmin").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// A World Cup 2026 match.
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
  // scheduled | live | finished
  status: text("status").notNull().default("scheduled"),
  elapsed: integer("elapsed"),
  homeScore: integer("homeScore").notNull().default(0),
  awayScore: integer("awayScore").notNull().default(0),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Live events for a match (goals carry player + minute, used for resolution).
export const matchEvent = pgTable("match_event", {
  id: serial("id").primaryKey(),
  matchId: integer("matchId").notNull(),
  externalId: text("externalId"),
  // goal | card | subst | var
  type: text("type").notNull(),
  detail: text("detail"),
  player: text("player"),
  team: text("team"),
  minute: integer("minute"),
  extraMinute: integer("extraMinute"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// A placed bet. `selection` holds market-specific payload as JSON.
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
  // pending | won | lost | void
  status: text("status").notNull().default("pending"),
  payout: integer("payout").notNull().default(0),
  settledAt: timestamp("settledAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Immutable record of every balance change.
export const ledger = pgTable("ledger", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  betId: integer("betId"),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balanceAfter").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
