-- Enable Supabase Realtime for the core app tables so home carousel,
-- standings leaderboard, admin approval queue, admin invites, and the
-- Swadhyay "not-yet-published" empty state can re-fetch server data the
-- moment another user or admin writes to these tables.
--
-- Idempotent: each ALTER PUBLICATION is guarded by a lookup in
-- pg_publication_tables so re-running the migration is safe.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'daily_notes'
  ) then
    alter publication supabase_realtime add table public.daily_notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'approved_daily_notes'
  ) then
    alter publication supabase_realtime add table public.approved_daily_notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'allowed_emails'
  ) then
    alter publication supabase_realtime add table public.allowed_emails;
  end if;
end $$;
