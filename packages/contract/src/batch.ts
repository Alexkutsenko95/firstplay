import { z } from 'zod';
import { AIRTIME_STEPS, SPOT_KICK_STEPS } from './steps';

export const PROTOCOL_VERSION = 1;
export const MAX_EVENTS_PER_BATCH = 20;
/** A page left open for an hour is no longer a first visit; also keeps `t` well inside a Postgres integer. */
export const MAX_EVENT_TIME_MS = 60 * 60 * 1000;
/** A game marks each step at most once per page load, so a real sequence stays far below this. */
export const MAX_EVENT_SEQ = 1000;

export const platformSchema = z.enum(['crazygames', 'site', 'dev', 'sim']);
export const deviceSchema = z.enum(['mobile', 'tablet', 'desktop']);

// Unknown fields are stripped, not rejected (z.object default): a newer game build that adds a field
// must not lose its whole batch on an older collector. Breaking changes bump `v` instead.
function funnelEventSchema<TStep extends z.ZodType>(step: TStep) {
  return z.object({
    id: z.uuid(),
    step,
    // Milliseconds since the page started loading, not a client clock: the server stamps the time itself.
    t: z.int().min(0).max(MAX_EVENT_TIME_MS),
    seq: z.int().min(0).max(MAX_EVENT_SEQ),
  });
}

/** One page load of one game: the step list is checked against that game only. */
function gameBatchSchema<TGame extends string, TStep extends z.ZodType>(game: TGame, step: TStep) {
  return z.object({
    v: z.literal(PROTOCOL_VERSION),
    sid: z.uuid(),
    game: z.literal(game),
    platform: platformSchema,
    device: deviceSchema,
    events: z
      .array(funnelEventSchema(step))
      .min(1)
      .max(MAX_EVENTS_PER_BATCH)
      .superRefine((events, ctx) => {
        // A resent event keeps its id; two equal ids in one batch mean a broken or forged sender.
        const seen = new Set<string>();
        events.forEach((event, index) => {
          if (seen.has(event.id)) {
            ctx.addIssue({ code: 'custom', message: 'Duplicate event id in the batch', path: [index, 'id'] });
          }
          seen.add(event.id);
        });
      }),
  });
}

export const spotKickBatchSchema = gameBatchSchema('spot-kick', z.enum(SPOT_KICK_STEPS));
export const airtimeBatchSchema = gameBatchSchema('airtime', z.enum(AIRTIME_STEPS));

export const eventBatchSchema = z.discriminatedUnion('game', [spotKickBatchSchema, airtimeBatchSchema]);

export type EventBatch = z.infer<typeof eventBatchSchema>;
export type FunnelEvent = EventBatch['events'][number];
export type Game = EventBatch['game'];
export type Platform = z.infer<typeof platformSchema>;
export type Device = z.infer<typeof deviceSchema>;
