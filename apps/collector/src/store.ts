import type { EventBatch } from '@firstplay/contract';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { events, type NewEvent } from './db/schema';

export interface EventStore {
  save(batch: EventBatch): Promise<void>;
  close(): Promise<void>;
}

export function toRows(batch: EventBatch): NewEvent[] {
  return batch.events.map((event) => ({
    id: event.id,
    sid: batch.sid,
    game: batch.game,
    platform: batch.platform,
    device: batch.device,
    step: event.step,
    t: event.t,
    seq: event.seq,
  }));
}

/**
 * One store per request. Hyperdrive pools the real database connections,
 * so opening a client per request is cheap; the client is closed after the response.
 */
export function createPostgresStore(connectionString: string): EventStore {
  // Settings from the Hyperdrive guide: few connections per Worker, no array types to fetch,
  // and prepared statements kept on — Hyperdrive's pooler does not handle postgres.js without them.
  const sql = postgres(connectionString, { max: 5, fetch_types: false, prepare: true });
  const db = drizzle(sql);

  return {
    async save(batch) {
      // One INSERT for the whole batch; a resent event is skipped by its primary key.
      await db.insert(events).values(toRows(batch)).onConflictDoNothing({ target: events.id });
    },
    close: () => sql.end(),
  };
}
