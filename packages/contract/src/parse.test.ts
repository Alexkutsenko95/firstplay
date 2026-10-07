import { describe, expect, it } from 'vitest';
import { MAX_EVENT_SEQ, MAX_EVENT_TIME_MS, MAX_EVENTS_PER_BATCH, parseBatch, type ParseBatchResult } from './index';

// Deterministic v4 UUIDs: tests must not depend on randomness.
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

const event = (n: number, overrides: Record<string, unknown> = {}) => ({
  id: uuid(100 + n),
  step: 'load',
  t: n * 100,
  seq: n,
  ...overrides,
});

const batch = (overrides: Record<string, unknown> = {}) => ({
  v: 1,
  sid: uuid(1),
  game: 'spot-kick',
  platform: 'sim',
  device: 'mobile',
  events: [event(0), event(1, { step: 'whistle' }), event(2, { step: 'first_kick' })],
  ...overrides,
});

function issuePaths(result: ParseBatchResult): string[] {
  if (result.ok) throw new Error('Expected the batch to be rejected');
  return result.issues.map((issue) => issue.path);
}

describe('parseBatch', () => {
  it('accepts a valid Spot Kick batch', () => {
    const result = parseBatch(batch());
    expect(result.ok).toBe(true);
  });

  it('accepts a valid Airtime batch', () => {
    const result = parseBatch(
      batch({
        game: 'airtime',
        events: [event(0), event(1, { step: 'first_contact' }), event(2, { step: 'outcome_drop' })],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a step that belongs to the other game's funnel", () => {
    const result = parseBatch(batch({ events: [event(0, { step: 'first_contact' })] }));
    expect(issuePaths(result)).toEqual(['events.0.step']);
  });

  it('rejects an unknown game', () => {
    expect(parseBatch(batch({ game: 'tetris' })).ok).toBe(false);
  });

  it('rejects a negative time', () => {
    expect(issuePaths(parseBatch(batch({ events: [event(0, { t: -1 })] })))).toEqual(['events.0.t']);
  });

  it('rejects a fractional time', () => {
    expect(issuePaths(parseBatch(batch({ events: [event(0, { t: 12.5 })] })))).toEqual(['events.0.t']);
  });

  it('rejects a time beyond the first-visit horizon', () => {
    expect(parseBatch(batch({ events: [event(0, { t: MAX_EVENT_TIME_MS })] })).ok).toBe(true);
    expect(issuePaths(parseBatch(batch({ events: [event(0, { t: MAX_EVENT_TIME_MS + 1 })] })))).toEqual(['events.0.t']);
  });

  it('rejects an impossible sequence number', () => {
    expect(issuePaths(parseBatch(batch({ events: [event(0, { seq: MAX_EVENT_SEQ + 1 })] })))).toEqual(['events.0.seq']);
  });

  it(`accepts exactly ${MAX_EVENTS_PER_BATCH} events and rejects one more`, () => {
    const events = (count: number) => Array.from({ length: count }, (_, n) => event(n));
    expect(parseBatch(batch({ events: events(MAX_EVENTS_PER_BATCH) })).ok).toBe(true);
    expect(issuePaths(parseBatch(batch({ events: events(MAX_EVENTS_PER_BATCH + 1) })))).toEqual(['events']);
  });

  it('rejects an empty event list', () => {
    expect(issuePaths(parseBatch(batch({ events: [] })))).toEqual(['events']);
  });

  it('rejects a malformed session id', () => {
    expect(issuePaths(parseBatch(batch({ sid: 'not-a-uuid' })))).toEqual(['sid']);
  });

  it('rejects two events with the same id and points at the duplicate', () => {
    const result = parseBatch(batch({ events: [event(0), event(1, { id: uuid(100) })] }));
    expect(issuePaths(result)).toEqual(['events.1.id']);
  });

  it('strips unknown fields instead of rejecting the batch', () => {
    const result = parseBatch(batch({ build: '1.4.0', events: [event(0, { extra: true })] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batch).not.toHaveProperty('build');
    expect(result.batch.events[0]).not.toHaveProperty('extra');
  });

  it('rejects a future protocol version', () => {
    expect(issuePaths(parseBatch(batch({ v: 2 })))).toEqual(['v']);
  });

  it.each([null, undefined, 'text', 42, []])('returns issues instead of throwing for %j', (input) => {
    expect(parseBatch(input).ok).toBe(false);
  });
});
