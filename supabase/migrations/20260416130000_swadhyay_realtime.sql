-- Enable Supabase Realtime for the Swadhyay tables so clients receive
-- postgres_changes notifications for new comments, edits, deletes, reactions,
-- and pin updates without needing to poll or refresh manually.
--
-- The `supabase_realtime` publication is created by Supabase for hosted
-- projects; `alter publication ... add table` is idempotent-unsafe, so we
-- guard each addition with a lookup in pg_publication_tables.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_comments'
  ) then
    alter publication supabase_realtime add table public.swadhyay_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_comment_reactions'
  ) then
    alter publication supabase_realtime add table public.swadhyay_comment_reactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_topics'
  ) then
    alter publication supabase_realtime add table public.swadhyay_topics;
  end if;
end $$;
