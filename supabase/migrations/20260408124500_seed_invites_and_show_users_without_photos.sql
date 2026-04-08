-- Seed initial invite rows (first/last + email) and make picker include users even without photos.
-- Names from allowlist appear in admin dashboard before users sign in.

with seed(email, first_name, last_name, is_organizer) as (
  values
    ('bidhinpatel3516@gmail.com', 'Bidhin', 'Patel', false),
    ('milsrocks07@gmail.com', 'Mils', 'Rocks', false)
)
insert into public.allowed_emails (email, display_name, is_organizer)
select
  lower(seed.email),
  nullif(trim(concat_ws(' ', seed.first_name, seed.last_name)), ''),
  seed.is_organizer
from seed
on conflict (email) do update
set
  display_name = excluded.display_name,
  is_organizer = excluded.is_organizer;

create or replace function public.roster_for_picker()
returns table (
  id uuid,
  display_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), '')
    ) as display_name,
    coalesce(nullif(trim(p.avatar_url), ''), '/logo.png') as avatar_url
  from public.profiles p
  inner join public.allowed_emails ae on ae.email = lower(p.email)
  where p.id <> v_uid
    and coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), ''),
      ''
    ) <> ''
  order by
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), ''),
      ae.email
    ) asc;
end;
$$;

revoke all on function public.roster_for_picker() from public;
grant execute on function public.roster_for_picker() to authenticated;
