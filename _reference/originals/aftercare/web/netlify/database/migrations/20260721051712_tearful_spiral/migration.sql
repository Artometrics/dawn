CREATE TABLE "card_art_cache" (
	"id" serial PRIMARY KEY,
	"card_id" varchar(64) NOT NULL UNIQUE,
	"blob_key" varchar(255) NOT NULL,
	"mime_type" varchar(64) DEFAULT 'image/png',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY,
	"user_id" varchar(128) NOT NULL,
	"title" varchar(200),
	"body" text NOT NULL,
	"mood" varchar(64),
	"tags" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY,
	"user_id" varchar(128) NOT NULL UNIQUE,
	"display_name" varchar(120),
	"birth_date" varchar(32),
	"birth_time" varchar(16),
	"birth_place" varchar(255),
	"timezone" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tarot_pulls" (
	"id" serial PRIMARY KEY,
	"user_id" varchar(128) NOT NULL,
	"spread_type" varchar(64) NOT NULL,
	"cards" jsonb NOT NULL,
	"interpretation" text,
	"question" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracking_logs" (
	"id" serial PRIMARY KEY,
	"user_id" varchar(128) NOT NULL,
	"type" varchar(64) NOT NULL,
	"value" integer,
	"label" varchar(120),
	"notes" text,
	"logged_on" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
