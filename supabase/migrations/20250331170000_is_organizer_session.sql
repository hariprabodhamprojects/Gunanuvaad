-- Phase 6: expose organizer flag for signed-in allowlisted users (for /admin guard in the app).

create or replace function public.is_organizer_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ae.is_organizer
      from public.allowed_emails ae
      inner join auth.users u on u.id = auth.uid()
      where lower(ae.email) = lower(u.email)
      limit 1
    ),
    false
  );
$$;

comment on function public.is_organizer_session() is
  'True when the current user''s email is on allowed_emails with is_organizer = true.';

revoke all on function public.is_organizer_session() from public;
grant execute on function public.is_organizer_session() to authenticated;
