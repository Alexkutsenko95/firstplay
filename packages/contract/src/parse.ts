import { eventBatchSchema, type EventBatch } from './batch';

export interface BatchIssue {
  /** Dotted path to the bad value, e.g. `events.3.t`; empty for the batch itself. */
  path: string;
  message: string;
}

export type ParseBatchResult = { ok: true; batch: EventBatch } | { ok: false; issues: BatchIssue[] };

/**
 * Validates an untrusted batch. Never throws: the collector answers bad input with a status code,
 * and callers get plain issues instead of zod internals.
 */
export function parseBatch(input: unknown): ParseBatchResult {
  const result = eventBatchSchema.safeParse(input);
  if (result.success) return { ok: true, batch: result.data };

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
  };
}
