CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_feed" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"matchId" integer,
	"betId" integer,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"badgeType" text NOT NULL,
	"earnedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badge_unique" UNIQUE("userId","badgeType")
);
--> statement-breakpoint
CREATE TABLE "bet" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"matchId" integer NOT NULL,
	"marketType" text NOT NULL,
	"label" text NOT NULL,
	"selection" jsonb NOT NULL,
	"minuteFrom" integer,
	"minuteTo" integer,
	"stake" integer NOT NULL,
	"odds" numeric(7, 2) NOT NULL,
	"potentialPayout" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payout" integer DEFAULT 0 NOT NULL,
	"isJoker" boolean DEFAULT false NOT NULL,
	"bonusPoints" integer DEFAULT 0 NOT NULL,
	"settledAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bet_reaction" (
	"id" serial PRIMARY KEY NOT NULL,
	"betId" integer NOT NULL,
	"userId" text NOT NULL,
	"emoji" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bet_reaction_unique" UNIQUE("betId","userId","emoji")
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"matchId" integer NOT NULL,
	"userId" text NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"betId" integer,
	"amount" integer NOT NULL,
	"balanceAfter" integer NOT NULL,
	"reason" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" serial PRIMARY KEY NOT NULL,
	"externalId" bigint,
	"homeTeam" text NOT NULL,
	"awayTeam" text NOT NULL,
	"homeTeamCode" text,
	"awayTeamCode" text,
	"kickoff" timestamp NOT NULL,
	"stage" text,
	"venue" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"elapsed" integer,
	"homeScore" integer DEFAULT 0 NOT NULL,
	"awayScore" integer DEFAULT 0 NOT NULL,
	"oddsJson" jsonb,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_externalId_unique" UNIQUE("externalId")
);
--> statement-breakpoint
CREATE TABLE "match_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"matchId" integer NOT NULL,
	"externalId" text,
	"type" text NOT NULL,
	"detail" text,
	"player" text,
	"team" text,
	"minute" integer,
	"extraMinute" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_event_unique" UNIQUE("matchId","player","minute","type")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"userId" text PRIMARY KEY NOT NULL,
	"displayName" text NOT NULL,
	"balance" integer DEFAULT 1000 NOT NULL,
	"balanceBackup" integer DEFAULT 1000 NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"avatarColor" text DEFAULT '#3498db' NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"bestStreak" integer DEFAULT 0 NOT NULL,
	"jokerUsedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_sub_unique" UNIQUE("userId","endpoint")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_prediction" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"predictedTeam" text NOT NULL,
	"isCorrect" boolean,
	"bonusAwarded" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;