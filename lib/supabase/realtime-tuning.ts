/**
 * Central knobs for Supabase Realtime → router.refresh() load.
 * Tuned for Nano (free) compute: coalesce bursts, pause when tab is hidden,
 * avoid redundant table subscriptions.
 */
export const REALTIME = {
  /** Default debounce when a component does not override. */
  defaultDebounceMs: 400,

  standings: {
    debounceMs: 800,
    /** Slow safety net only — Realtime covers normal updates. */
    fallbackIntervalMs: 120_000,
  },

  spotlight: {
    debounceMs: 1_000,
  },

  swadhyayFeed: {
    debounceMs: 700,
  },

  calendar: {
    debounceMs: 600,
  },
} as const;

/** Header score strip — full leaderboard RPC is shared across users. */
export const STANDINGS_HEADER_REVALIDATE_SEC = 30;
