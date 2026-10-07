import type { EventBatch } from '@firstplay/contract';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createApp, MAX_BODY_BYTES } from './app';
import type { EventStore } from './store';

const ORIGIN = 'http://localhost:5173';
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

const validBatch = {
  v: 1,
  sid: uuid(1),
  game: 'spot-kick',
  platform: 'dev',
  device: 'desktop',
  events: [
    { id: uuid(101), step: 'load', t: 0, seq: 0 },
    { id: uuid(102), step: 'first_kick', t: 4200, seq: 1 },
  ],
};

function memoryStore(options: { failOnSave?: boolean } = {}) {
  const saved: EventBatch[] = [];
  let closed = 0;
  const store: EventStore = {
    save(batch) {
      if (options.failOnSave) return Promise.reject(new Error('database is down'));
      saved.push(batch);
      return Promise.resolve();
    },
    close() {
      closed++;
      return Promise.resolve();
    },
  };
  return { store, saved, closed: () => closed };
}

async function send(store: EventStore, body: BodyInit | null, headers: Record<string, string> = { Origin: ORIGIN }) {
  const app = createApp(() => store);
  const ctx = createExecutionContext();
  const response = await app.request('/e', { method: 'POST', headers, body }, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe('POST /e', () => {
  it('stores a valid batch and answers 204', async () => {
    const memory = memoryStore();
    const response = await send(memory.store, JSON.stringify(validBatch));

    expect(response.status).toBe(204);
    expect(memory.saved).toHaveLength(1);
    expect(memory.saved[0]?.events.map((event) => event.step)).toEqual(['load', 'first_kick']);
    expect(memory.closed()).toBe(1);
  });

  it('rejects a page from an origin that is not allowed', async () => {
    const memory = memoryStore();
    const response = await send(memory.store, JSON.stringify(validBatch), { Origin: 'https://evil.example' });

    expect(response.status).toBe(403);
    expect(memory.saved).toHaveLength(0);
  });

  it('rejects a request without an Origin header', async () => {
    const memory = memoryStore();
    expect((await send(memory.store, JSON.stringify(validBatch), {})).status).toBe(403);
  });

  it('rejects an oversized body even without Content-Length', async () => {
    const memory = memoryStore();
    const huge = new TextEncoder().encode('x'.repeat(MAX_BODY_BYTES + 1));
    // A stream has no length up front, so only counting the bytes can catch it.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(huge);
        controller.close();
      },
    });

    const response = await send(memory.store, stream);
    expect(response.status).toBe(413);
    expect(memory.saved).toHaveLength(0);
  });

  it('answers 400 to a body that is not JSON', async () => {
    const response = await send(memoryStore().store, '{"v":1,');
    expect(response.status).toBe(400);
  });

  it('answers 400 with the contract issues to an invalid batch', async () => {
    const memory = memoryStore();
    const response = await send(memory.store, JSON.stringify({ ...validBatch, game: 'airtime' }));

    expect(response.status).toBe(400);
    const body: { issues: { path: string }[] } = await response.json();
    // `first_kick` is a Spot Kick step, so it is invalid in an Airtime batch.
    expect(body.issues.map((issue) => issue.path)).toEqual(['events.1.step']);
    expect(memory.saved).toHaveLength(0);
  });

  it('answers 500 and still closes the connection when the database fails', async () => {
    const memory = memoryStore({ failOnSave: true });
    const response = await send(memory.store, JSON.stringify(validBatch));

    expect(response.status).toBe(500);
    expect(memory.closed()).toBe(1);
  });
});

describe('GET /health', () => {
  it('answers ok', async () => {
    const response = await createApp(() => memoryStore().store).request('/health', {}, env);
    expect(await response.text()).toBe('ok');
  });
});
