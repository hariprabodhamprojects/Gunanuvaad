-- Phase 3: read-only roster for mosaic (no email exposed; allowlisted members with complete profiles only)
create or replace function public.roster_for_mosaic()
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
begin
  if auth.uid() is null or not public.is_allowlisted_session() then
    return;
  end if;

  return query
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  inner join public.allowed_emails ae on ae.email = p.email
  where btrim(coalesce(p.display_name, '')) <> ''
    and btrim(coalesce(p.avatar_url, '')) <> ''
  order by p.display_name asc;
end;
$$;

revoke all on function public.roster_for_mosaic() from public;
grant execute on function public.roster_for_mosaic() to authenticated;
