import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Raw funnel events: one row per step, exactly as accepted by the collector. */
export const events = pgTable(
  'events',
  {
    // The client-generated event id: a resent batch hits the primary key and is skipped, not duplicated.
    id: uuid('id').primaryKey(),
    sid: uuid('sid').notNull(),
    // Plain text, not Postgres enums: the contract validates values, and a new game needs no migration.
    game: text('game').notNull(),
    platform: text('platform').notNull(),
    device: text('device').notNull(),
    step: text('step').notNull(),
    t: integer('t').notNull(),
    seq: integer('seq').notNull(),
    // Server time: the only clock we trust.
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('events_game_received_at_idx').on(table.game, table.receivedAt)],
);

export type NewEvent = typeof events.$inferInsert;
