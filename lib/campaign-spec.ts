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
