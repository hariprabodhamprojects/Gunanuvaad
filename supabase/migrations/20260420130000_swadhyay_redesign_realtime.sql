-- Realtime publication + replica identity repair for the Swadhyay weekly
-- redesign.
--
-- Two things get fixed here:
--
-- (1) PUBLICATION — `20260416130000_swadhyay_realtime.sql` added the *old*
--     Swadhyay tables (`swadhyay_comments`, `swadhyay_comment_reactions`,
--     `swadhyay_topics`) to the `supabase_realtime` publication. The
--     redesign migration `20260418120000_swadhyay_weekly_redesign.sql`
--     dropped the comments tables and introduced four new ones, but didn't
--     re-register them with Realtime. Effect: client subscribers in
--       • components/swadhyay/swadhyay-posts-feed.tsx
--       • components/admin/swadhyay-moderation-list.tsx
--       • components/standings-view.tsx (after this week's standings fix)
--     received zero `postgres_changes` events — the feed only *looked* live
--     for the acting user via Next.js `revalidatePath`, never across tabs.
--
-- (2) REPLICA IDENTITY — subtle Postgres default that bites anything
--     relying on Realtime `UPDATE` events under RLS. On UPDATE, Postgres
--     by default logs only the primary key of the *old* row to the WAL.
--     Supabase Realtime needs the full old row to evaluate the SELECT
--     policy against both pre- and post-images; without it, the event is
--     dropped. Symptom: revokes (is_revoked false → true), edits
--     (body/updated_at), and topic publish toggles all arrive for no one.
--     Setting `REPLICA IDENTITY FULL` makes Postgres log every column of
--     the old row, unlocking RLS-filtered UPDATE delivery.
--
-- Both steps are idempotent — safe to re-run on a hand-fixed or partially
-- migrated database.

-- ── (1) Publication membership ────────────────────────────────────────────
do $$
declare
  t text;
  swadhyay_tables text[] := array[
    'swadhyay_posts',
    'swadhyay_post_replies',
    'swadhyay_post_reactions',
    'swadhyay_reply_reactions'
  ];
begin
  foreach t in array swadhyay_tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

-- ── (2) REPLICA IDENTITY FULL for tables with UPDATE subscribers ──────────
-- `swadhyay_posts` : revoke, restore, edit → all UPDATE.
-- `swadhyay_post_replies` : edit → UPDATE (hard-delete stays as DELETE).
-- `swadhyay_topics` : publish/unpublish toggle + date edits → UPDATE. Not
--    strictly new here (publication was added in the earlier migration),
--    but it suffered the same silent-drop problem.
--
-- Tables we deliberately *don't* touch:
--   • daily_notes — INSERT-only subscriber; DELETE is admin SQL only.
--   • *_reactions tables — INSERT/DELETE only; no UPDATE path exists.
--
-- Cost: REPLICA IDENTITY FULL increases WAL volume for these tables since
-- every column of the old row gets logged. For Swadhyay's write rate this
-- is negligible, and we'd rather pay a few extra bytes of WAL than lose
-- realtime correctness.
alter table public.swadhyay_posts replica identity full;
alter table public.swadhyay_post_replies replica identity full;
alter table public.swadhyay_topics replica identity full;
