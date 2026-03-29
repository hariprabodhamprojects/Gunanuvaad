-- Session allowlist check: same logic as joining auth.users ↔ allowed_emails in SQL Editor,
-- but callable from the app with a normal JWT (avoids RLS/PostgREST edge cases on SELECT).
create or replace function public.is_allowlisted_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails ae
    inner join auth.users u on u.id = auth.uid()
    where lower(ae.email) = lower(u.email)
  );
$$;

revoke all on function public.is_allowlisted_session() from public;
grant execute on function public.is_allowlisted_session() to authenticated;
