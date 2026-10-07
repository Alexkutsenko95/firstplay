import { parseBatch, type BatchIssue } from '@firstplay/contract';
import { Hono } from 'hono';
import { readTextWithLimit } from './body';
import type { EventStore } from './store';

/** A full batch of 20 events is ~2 KB; anything near 8 KB is not a beacon. */
export const MAX_BODY_BYTES = 8 * 1024;

export type StoreFactory = (env: Env) => EventStore;

function allowedOrigins(env: Env): Set<string> {
  return new Set(
    env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

/** The store is injected so tests run the real HTTP layer without a database. */
export function createApp(storeFor: StoreFactory) {
  const app = new Hono<{ Bindings: Env }>();

  app.get('/health', (c) => c.text('ok'));

  // The game sends `navigator.sendBeacon(url, JSON.stringify(batch))`: a text/plain POST,
  // so the browser does no CORS preflight and nobody reads the response.
  app.post('/e', async (c) => {
    // A browser always sends Origin on a POST. It is a filter against other sites' pages, not authentication:
    // a script can forge it, which is why the payload is validated anyway.
    const origin = c.req.header('Origin');
    if (!origin || !allowedOrigins(c.env).has(origin)) return c.body(null, 403);

    const text = await readTextWithLimit(c.req.raw, MAX_BODY_BYTES);
    if (text === null) return c.body(null, 413);

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      const issues: BatchIssue[] = [{ path: '', message: 'The body is not valid JSON' }];
      return c.json({ issues }, 400);
    }

    const result = parseBatch(payload);
    if (!result.ok) return c.json({ issues: result.issues }, 400);

    const store = storeFor(c.env);
    try {
      await store.save(result.batch);
    } finally {
      c.executionCtx.waitUntil(store.close());
    }
    return c.body(null, 204);
  });

  app.onError((error, c) => {
    console.error('Request failed', error);
    return c.body(null, 500);
  });

  return app;
}
