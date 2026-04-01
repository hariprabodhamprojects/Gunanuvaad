-- Increase recipient lock threshold to 50 and hide locked recipients in picker roster.
-- Keeps campaign timezone behavior ftestrom 20250331200000_campaign_timezone_toronto.sql.

create or replace function public.recipient_write_eligibility(p_recipient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_campaign_date date;
  v_last timestamptz;
  v_cnt int;
  v_k int := 50;
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

  select max(created_at) into v_last
  from public.daily_notes
  where author_id = v_uid
    and recipient_id = p_recipient_id;

  if v_last is null then
    return jsonb_build_object('ok', true, 'code', 'eligible');
  end if;

  select count(distinct recipient_id) into v_cnt
  from public.daily_notes
  where author_id = v_uid
    and created_at > v_last
    and recipient_id <> p_recipient_id;

  if v_cnt >= v_k then
    return jsonb_build_object('ok', true, 'code', 'eligible');
  end if;

  return jsonb_build_object(
    'ok', false,
    'code', 'recipient_locked',
    'need_more', v_k - v_cnt
  );
end;
$$;

-- Picker-only roster: hide recipients currently locked for this author.
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
  v_k int := 50;
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return;
  end if;

  return query
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  inner join public.allowed_emails ae on ae.email = p.email
  left join lateral (
    select max(dn.created_at) as last_written_at
    from public.daily_notes dn
    where dn.author_id = v_uid
      and dn.recipient_id = p.id
  ) lw on true
  left join lateral (
    select count(distinct dn2.recipient_id) as others_since_last
    from public.daily_notes dn2
    where dn2.author_id = v_uid
      and lw.last_written_at is not null
      and dn2.created_at > lw.last_written_at
      and dn2.recipient_id <> p.id
  ) c on true
  where p.id <> v_uid
    and btrim(coalesce(p.display_name, '')) <> ''
    and btrim(coalesce(p.avatar_url, '')) <> ''
    and (
      lw.last_written_at is null
      or coalesce(c.others_since_last, 0) >= v_k
    )
  order by p.display_name asc;
end;
$$;

revoke all on function public.roster_for_picker() from public;
grant execute on function public.roster_for_picker() to authenticated;
