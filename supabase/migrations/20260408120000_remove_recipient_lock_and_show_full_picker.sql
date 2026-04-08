-- Remove recipient lock completely.
-- Users can write to the same recipient on different campaign days.

create or replace function public.recipient_write_eligibility(p_recipient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_campaign_date date;
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  if p_recipient_id = v_uid then
    return jsonb_build_object('ok', false, 'code', 'self');
  end if;

  if not exists (
    select 1
    from public.profiles p
    inner join public.allowed_emails ae on ae.email = p.email
    where p.id = p_recipient_id
      and btrim(coalesce(p.display_name, '')) <> ''
      and btrim(coalesce(p.avatar_url, '')) <> ''
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_recipient');
  end if;

  v_campaign_date := (timezone('America/Toronto', now()))::date;

  if exists (
    select 1
    from public.daily_notes
    where author_id = v_uid
      and campaign_date = v_campaign_date
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_today');
  end if;

  return jsonb_build_object('ok', true, 'code', 'eligible');
end;
$$;

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
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  inner join public.allowed_emails ae on ae.email = p.email
  where p.id <> v_uid
    and btrim(coalesce(p.display_name, '')) <> ''
    and btrim(coalesce(p.avatar_url, '')) <> ''
  order by p.display_name asc;
end;
$$;

revoke all on function public.roster_for_picker() from public;
grant execute on function public.roster_for_picker() to authenticated;
