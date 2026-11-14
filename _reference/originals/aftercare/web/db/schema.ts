import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id: serial().primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull().unique(),
  displayName: varchar('display_name', { length: 120 }),
  birthDate: varchar('birth_date', { length: 32 }),
  birthTime: varchar('birth_time', { length: 16 }),
  birthPlace: varchar('birth_place', { length: 255 }),
  timezone: varchar({ length: 64 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const journalEntries = pgTable('journal_entries', {
  id: serial().primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  title: varchar({ length: 200 }),
  body: text().notNull(),
  mood: varchar({ length: 64 }),
  tags: jsonb().$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const tarotPulls = pgTable('tarot_pulls', {
  id: serial().primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  spreadType: varchar('spread_type', { length: 64 }).notNull(),
  cards: jsonb().$type<TarotPullCard[]>().notNull(),
  interpretation: text(),
  question: text(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const trackingLogs = pgTable('tracking_logs', {
  id: serial().primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  type: varchar({ length: 64 }).notNull(),
  value: integer(),
  label: varchar({ length: 120 }),
  notes: text(),
  loggedOn: varchar('logged_on', { length: 32 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const cardArtCache = pgTable('card_art_cache', {
  id: serial().primaryKey(),
  cardId: varchar('card_id', { length: 64 }).notNull().unique(),
  blobKey: varchar('blob_key', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 64 }).default('image/png'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type TarotPullCard = {
  cardId: string
  name: string
  reversed: boolean
  position?: string
  imageUrl?: string | null
}

export type Profile = typeof profiles.$inferSelect
export type JournalEntry = typeof journalEntries.$inferSelect
export type TarotPull = typeof tarotPulls.$inferSelect
export type TrackingLog = typeof trackingLogs.$inferSelect
