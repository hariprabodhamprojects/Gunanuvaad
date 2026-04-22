-- ─────────────────────────────────────────────────────────────────────────────
-- Wednesday P1 — Approved-notes realtime hardening.
--
-- Problem:
--   `public.approved_daily_notes` has RLS enabled (since
--   20250331180000_admin_featured_notes_allowlist_overview.sql) but *zero*
--   policies. Supabase Realtime evaluates the SELECT policy per subscriber
--   before delivering `postgres_changes` events — so every subscriber was
--   silently dropped, even though the table is in `supabase_realtime`
--   publication. That broke:
--     • components/home/approved-notes-slideshow.tsx (home slideshow never
--       auto-refreshed when a note was approved/unapproved).
--     • components/admin/approved-notes-table.tsx (moderation list needed a
--       manual reload to see another organizer's actions).
--
-- Writes still go through `admin_approve_daily_note` / `admin_disapprove_
-- daily_note`, which are `security definer` and therefore bypass RLS. This
-- migration only opens *read* access, and only to allowlisted sessions.
--
-- Also sets REPLICA IDENTITY FULL so DELETE (un-approve) events carry the
-- full pre-image in the WAL — matches the pattern already established in
-- 20260420130000_swadhyay_redesign_realtime.sql, keeps realtime behavior
-- consistent across the app, and future-proofs the table for UPDATE events
-- (e.g. if we ever add an "approved_note_revision" workflow).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── (1) SELECT policy for allowlisted members ────────────────────────────────
-- Idempotent: drop first so re-running the migration upgrades the policy
-- in place instead of erroring out with "policy already exists".
drop policy if exists "approved_daily_notes_select_allowlisted"
  on public.approved_daily_notes;

create policy "approved_daily_notes_select_allowlisted"
  on public.approved_daily_notes
  for select
  to authenticated
  using (public.is_allowlisted_session());

-- Note: no INSERT/UPDATE/DELETE policies. Those paths continue to run
-- exclusively through the `security definer` admin RPCs, so we don't
-- accidentally grant any write surface to regular members.

-- ── (2) REPLICA IDENTITY FULL for UPDATE/DELETE realtime delivery ────────────
-- Without this, Supabase Realtime can't evaluate the SELECT policy against
-- the pre-image of a DELETE/UPDATE and silently drops the event. Our SELECT
-- policy above is row-agnostic (session-scoped) so DELETEs would likely
-- propagate even under `REPLICA IDENTITY DEFAULT`, but setting FULL avoids
-- foot-guns if we ever add row-level predicates later.
alter table public.approved_daily_notes replica identity full;
