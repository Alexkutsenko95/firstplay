// Funnel steps, mirrored from the games (shared/portal/firstVisit.ts and each game's firstVisit.ts).
// A game marks every step at most once per page load.

export const COMMON_STEPS = [
  'load',
  'late_load',
  'first_frame',
  'touch',
  'accepted_touch',
  'first_outcome',
  'hidden',
  'window_end',
] as const;

export const SPOT_KICK_STEPS = [
  ...COMMON_STEPS,
  'whistle',
  'first_kick',
  'second_kick',
  'outcome_goal',
  'outcome_saved',
  'outcome_post',
  'outcome_miss',
] as const;

export const AIRTIME_STEPS = [...COMMON_STEPS, 'whistle', 'first_contact', 'second_contact', 'outcome_drop'] as const;
