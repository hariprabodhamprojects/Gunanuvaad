/**
 * Phase 0 — single place for values you will lock before building submit rules (Phase 4).
 * Phase 6 — `/admin` uses `allowed_emails.is_organizer` + `is_organizer_session()` RPC.
 * Change these here; later phases import from this module instead of scattering magic numbers.
 */
export const CAMPAIGN_TIMEZONE = "Asia/Kolkata"; // TODO: confirm with your group
/** Must match `timezone('Asia/Kolkata', …)` in Supabase migrations for `campaign_date`. */

/** Recipients lock until author writes to K *other distinct* people (see product plan). */
export const RECIPIENT_LOCK_K = 25; // TODO: clamp to roster_size - 2 in SQL + UI

/** Enforced in `submit_daily_note` RPC and server actions. */
export const NOTE_BODY_MIN_LEN = 1;
export const NOTE_BODY_MAX_LEN = 4000;

/** Tie-break when streaks tie — UI order uses name; SQL uses display_name. */
export type StreakTieBreak = "longest_historical_then_points";
export const STREAK_TIE_BREAK: StreakTieBreak = "longest_historical_then_points";

/**
 * Standings points: first note to each recipient = 2, each further note to that recipient = 1.
 * Per author total = note_count + distinct_recipients (see `standings_leaderboards` migration).
 * Tied scores share the same rank (`DENSE_RANK()`); next score level is the next integer (1,1,1,2). Order within a tie: name.
 */
