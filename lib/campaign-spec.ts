/**
 * Campaign-wide constants that the TypeScript layer needs *in sync with SQL*.
 *
 * ─── SOURCE-OF-TRUTH NOTE ──────────────────────────────────────────────────
 * For any value defined here, the authoritative copy lives in a Supabase
 * migration. If these diverge, the database wins. Keep the cross-reference in
 * each block so future phases can collapse this into a generated artifact
 * (see QA report §5.1 — source-of-truth restructure).
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Single timezone that defines "what calendar day is it?" for every campaign
 * write and read (daily notes, Swadhyay posts, standings streaks).
 *
 * Authoritative copy: `supabase/migrations/20250331200000_campaign_timezone_toronto.sql`.
 * Used server-side as `timezone('America/Toronto', now())::date` in:
 *   - `submit_daily_note` (latest: `20260419120000_daily_note_min_30.sql`)
 *   - `recipient_write_eligibility` (`20260408134000_allow_writes_to_invited_not_joined.sql`)
 *   - `_swadhyay_posts_before_insert` trigger (`20260418120000_swadhyay_weekly_redesign.sql`)
 */
export const CAMPAIGN_TIMEZONE = "America/Toronto";

/** Short label for UI copy ("Resets at midnight …"). */
export const CAMPAIGN_TIMEZONE_SHORT_LABEL = "Toronto time";

/**
 * Enforced in three places (all must agree):
 *   1. Client composer (`components/roster/roster-person-dialog.tsx`) — soft UI block.
 *   2. Server action (`lib/notes/daily-note-actions.ts`) — trims + validates.
 *   3. SQL RPC `submit_daily_note` — authoritative.
 *
 * Authoritative copy: `supabase/migrations/20260419120000_daily_note_min_30.sql`.
 *
 * Note: JS `string.length` counts UTF-16 code units, Postgres `char_length`
 * counts characters. For inputs with astral-plane emojis the two can disagree
 * by a few. See QA report P2 item "emoji edge case".
 */
export const NOTE_BODY_MIN_LEN = 30;
export const NOTE_BODY_MAX_LEN = 4000;

/**
 * Standings scoring (as of migration `20260416150000_standings_flat_two_per_note.sql`,
 * then carried forward unchanged through `20260418120000_swadhyay_weekly_redesign.sql`):
 *
 *   Daily notes: every note = 2 points. Repeats to the same recipient are
 *                rewarded equally — no first/second weighting.
 *   Swadhyay:    every distinct campaign_date on which the author made at
 *                least one non-revoked post on a published topic whose window
 *                contains that date = 2 points.
 *
 *   Total points = note_points + swadhyay_points.
 *
 *   Ranks use DENSE_RANK() (ties share a rank, next tier is next integer).
 *
 * This replaces the earlier per-recipient 2/1 formula documented in
 * `20250331130000_standings_points_formula.sql` — retained only for history.
 *
 * Authoritative copy: `standings_leaderboards()` inside
 * `supabase/migrations/20260418120000_swadhyay_weekly_redesign.sql`.
 *
 * Change policy: scoring changes MUST ship as a new migration that redefines
 * `standings_leaderboards()`. This comment block is not authoritative.
 */
export const POINTS_PER_DAILY_NOTE = 2;
export const POINTS_PER_SWADHYAY_DAY = 2;

/**
 * Streak ranking:
 *   - A streak is the length of the current run of consecutive `campaign_date`
 *     values on which the author sent a daily note (timezone-aligned to
 *     `CAMPAIGN_TIMEZONE`).
 *   - Ties are broken by DENSE_RANK() then alphabetical `display_name`.
 *
 * Authoritative copy: `_streak_days_for_author` in
 * `supabase/migrations/20250331120000_phase5_standings.sql` and the streak
 * CTE in `standings_leaderboards()` (see above).
 */
