-- Realtime publication repair for the Swadhyay weekly redesign.
--
-- History: `20260416130000_swadhyay_realtime.sql` added the *old* Swadhyay
-- tables (`swadhyay_comments`, `swadhyay_comment_reactions`,
-- `swadhyay_topics`) to the `supabase_realtime` publication. The redesign
-- migration `20260418120000_swadhyay_weekly_redesign.sql` dropped the
-- comments tables and introduced four new ones, but didn't re-register them
-- with Realtime. Effect: client subscribers in
--   • components/swadhyay/swadhyay-posts-feed.tsx
--   • components/admin/swadhyay-moderation-list.tsx
--   • components/standings-view.tsx (after this Monday's fix)
-- received zero postgres_changes events — the feed only *looked* live for
-- the acting user (local revalidatePath), not across tabs/devices.
--
-- This migration makes the publication match the current schema. Idempotent:
-- each addition is guarded by a `pg_publication_tables` lookup so re-running
-- against a hand-fixed database is safe. Topics are already published by
-- the earlier file, so we skip that entry (the guard catches it too).

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
