import { parseBatch } from '@firstplay/contract';
import { describe, expect, it } from 'vitest';
import { toRows } from './store';

describe('toRows', () => {
  it('flattens a batch into one row per event with the batch fields copied', () => {
    const result = parseBatch({
      v: 1,
      sid: '00000000-0000-4000-8000-000000000001',
      game: 'airtime',
      platform: 'site',
      device: 'mobile',
      events: [
        { id: '00000000-0000-4000-8000-000000000101', step: 'load', t: 0, seq: 0 },
        { id: '00000000-0000-4000-8000-000000000102', step: 'first_contact', t: 3100, seq: 1 },
      ],
    });
    if (!result.ok) throw new Error('fixture must be valid');

    expect(toRows(result.batch)).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000101',
        sid: '00000000-0000-4000-8000-000000000001',
        game: 'airtime',
        platform: 'site',
        device: 'mobile',
        step: 'load',
        t: 0,
        seq: 0,
      },
      {
        id: '00000000-0000-4000-8000-000000000102',
        sid: '00000000-0000-4000-8000-000000000001',
        game: 'airtime',
        platform: 'site',
        device: 'mobile',
        step: 'first_contact',
        t: 3100,
        seq: 1,
      },
    ]);
  });
});
